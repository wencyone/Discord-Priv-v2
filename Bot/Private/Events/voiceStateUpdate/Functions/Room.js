const { PermissionsBitField: { Flags }, Events, ChannelType, bold, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Settings = require('../../../../Schema/Settings');
const { formatPrivateRoomName } = require('../../../../Base/PrivateRoom');

const VOICE_RESTRICTION_RELEASE_DELAY = 2000;

module.exports = async function Room(client, oldState, newState) {
    const document = await Settings.findOne({ id: oldState.guild.id });
    if (!document) return;

    const guild = client.guilds.cache.get(oldState.guild.id);
    if (!guild) return;

    const member = newState.member || oldState.member || newState.guild.members.cache.get(newState.id);
    if (!member) return;
    const roomControl = (document?.privateRooms || []).find(x => x.owner === member?.id);
    const oldRoom = (document?.privateRooms || []).find(x => x.channel === oldState.channelId);
    const newRoom = (document?.privateRooms || []).find(x => x.channel === newState.channelId);

    if (oldRoom && oldState.channelId === newState.channelId
        && (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf)) {
        await saveVoiceRestriction(member.guild.id, oldRoom, member.id, newState.serverMute, newState.serverDeaf);
    }

    if (oldRoom && oldState.channelId !== newState.channelId) {
        const restriction = getVoiceRestriction(oldRoom, member.id);
        if (restriction) scheduleRestrictionRelease(member.guild, oldRoom.channel, member.id, restriction);
    }

    if (newRoom && oldState.channelId !== newState.channelId) {
        const restriction = getVoiceRestriction(newRoom, member.id);
        if (restriction?.mute && !newState.serverMute) await member.voice.setMute(true, 'Özel oda susturma kaydı').catch(() => null);
        if (restriction?.deaf && !newState.serverDeaf) await member.voice.setDeaf(true, 'Özel oda sağırlaştırma kaydı').catch(() => null);
    }

    if (newRoom?.owner === member.id && newState.channel) {
        await grantRoomOwnerVoicePermissions(newState.channel, member.id);
    }

    if (newState.channelId === document?.secretRoomChannel) {
        if (roomControl) {
            const rooms = Array.isArray(roomControl) ? roomControl : [roomControl];
            for (const room of rooms) {
                const channel = guild.channels.cache.get(room?.channel);
                if (!channel) {
                    await Settings.updateOne({ id: member.guild.id }, { $pull: { privateRooms: { owner: member.id } } });
                    return;
                } else {
                    if (channel.members.size === 0) {
                        await channel.delete().catch(e => console.log("Kanal silinemedi:", e));
                        await Settings.updateOne({ id: member.guild.id }, { $pull: { privateRooms: { owner: member.id } } });
                    }
                }
            }
        }

        const parentCategory = newState.channel.parent;
        const categoryPerms = parentCategory ? Array.from(parentCategory.permissionOverwrites.cache.values()) : [];
        
        const perms = categoryPerms.map(overwrite => ({
            id: overwrite.id,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray()
        }));
        denyRoomTextMessages(perms, newState.guild.roles.everyone.id, client.user.id);
        allowBotRoomPanel(perms, client.user.id);

        const xRole = newState.guild.roles.cache.find(r => r.name.toLowerCase().includes('giriş çıkış'));
        if (xRole) {
            perms.push({
                id: xRole.id,
                allow: [
                    Flags.Connect,
                    Flags.Stream,
                    Flags.Speak,
                    Flags.ViewChannel,
                ],
                deny: [
                    Flags.SendMessages
                ]
            });
        }

        perms.push({
            id: member.id,
            allow: [
                Flags.Connect,
                Flags.Stream,
                Flags.Speak,
                Flags.ViewChannel,
                Flags.MoveMembers,
                Flags.MuteMembers,
                Flags.DeafenMembers,
            ],
            deny: [
                Flags.SendMessages
            ]
        });

        const newChannel = await newState.guild.channels.create({
            name: formatPrivateRoomName(member.user?.displayName),
            type: ChannelType.GuildVoice,
            parent: newState.channel.parentId,
            permissionOverwrites: perms
        }).catch(e => console.log(e));
        if (!newChannel) return;

        await newState.setChannel(newChannel).catch(() => null);
        await sendRoomControlButtons(client, newChannel);
        await Settings.updateOne({ id: member.guild.id }, { $push: { privateRooms: { owner: member.id, channel: newChannel.id } } });
    }

    if (!oldState.channel && newState.channel) {
        const channel = guild.channels.cache.get(newState.channelId);
        const control = document?.privateRooms.find(x => x.channel === channel.id);
        if (!control) return;

        const member = guild.members.cache.get(newState.id);

        const overwrite = channel.permissionOverwrites.cache.find(o => o.id === newState.member.id || o.id === newState.member.roles.highest.id);
        const isAllow = overwrite ? overwrite.allow.has(Flags.Connect) : false;
        const isLock = channel.permissionOverwrites.cache.some(o => o.id === channel.guild.roles.everyone.id && o.deny.has(Flags.Connect));
        const isAdmin = newState.member.permissions.has(Flags.Administrator);
        const hasSlashRole = newState.member.roles.cache.some(role => role.name.toLowerCase().includes('/'));
        const hasXRole = newState.member.roles.cache.some(role => role.name.toLowerCase().includes('giriş çıkış'));

        if (isAdmin && !isAllow && isLock && !hasSlashRole && !hasXRole) {
            if (member?.voice.channel) {
                member.send({ content: `${bold(channel.name)} adlı özel oda için yetkiniz bulunmamaktadır.` }).catch();
                channel?.send({ content: `${member} kullanıcısı kanala katıldı fakat kanalda izni olmadığı için bağlantısı kesildi...` }).then((e) => deleteMessageLater(e, 20000)).catch(() => null);
                member.voice.disconnect();
            }
            return;
        }
    }

    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        const channel = guild.channels.cache.get(newState?.channelId);
        const control = document?.privateRooms.find(x => x.channel === channel.id);
        if (!control) return;

        const member = guild.members.cache.get(newState.member.id);

        const overwrite = channel.permissionOverwrites.cache.find(o => o.id === newState.member.id || o.id === newState.member.roles.highest.id);
        const isAllow = overwrite ? overwrite.allow.has(Flags.Connect) : false;
        const isLock = channel.permissionOverwrites.cache.some(o => o.id === channel.guild.roles.everyone.id && o.deny.has(Flags.Connect));
        const isAdmin = newState.member.permissions.has(Flags.Administrator);
        const hasSlashRole = newState.member.roles.cache.some(role => role.name.toLowerCase().includes('/'));
        const hasXRole = newState.member.roles.cache.some(role => role.name.toLowerCase().includes('giriş çıkış'));

        if (isAdmin && !isAllow && isLock && !hasSlashRole && !hasXRole) {
            if (member?.voice.channel) {
                member.send({ content: `${bold(channel.name)} adlı özel oda için yetkiniz bulunmamaktadır.` }).catch(() => null);
                channel.send({ content: `${member} kullanıcısı kanala katıldı fakat kanalda izni olmadığı için bağlantısı kesildi...` }).then((e) => deleteMessageLater(e, 20000)).catch(() => null);
                member.voice.disconnect();
            }
            return;
        }
    }

    if (oldState.channel && !newState.channel) {
        const channel = guild.channels.cache.get(oldState.channelId);
        const control = document?.privateRooms.find(x => x.channel === channel.id);
        if (!control) return;
        if (channel?.members.size === 0) {
            await channel.delete().catch(e => console.log("Kanal silinemedi:", e));
            await Settings.updateOne({ id: member.guild.id }, { $pull: { privateRooms: { owner: member.id } } });
        }
    }
}

function getVoiceRestriction(room, userId) {
    return (room?.voiceRestrictions || []).find((restriction) => restriction.userId === userId) || null;
}

async function saveVoiceRestriction(guildId, room, userId, mute, deaf) {
    const restrictions = [...(room.voiceRestrictions || [])].filter((restriction) => restriction.userId !== userId);
    if (mute || deaf) restrictions.push({ userId, mute: Boolean(mute), deaf: Boolean(deaf) });
    room.voiceRestrictions = restrictions;
    await Settings.updateOne(
        { id: guildId, 'privateRooms.channel': room.channel },
        { $set: { 'privateRooms.$.voiceRestrictions': restrictions } }
    );
}

function scheduleRestrictionRelease(guild, roomId, userId, restriction) {
    setTimeout(async () => {
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
        if (!member?.voice) return;

        const document = await Settings.findOne({ id: guild.id }).lean().catch(() => null);
        const currentRoom = (document?.privateRooms || []).find((room) => room.channel === member.voice.channelId);
        const currentRestriction = getVoiceRestriction(currentRoom, userId);
        if (member.voice.channelId === roomId) return;

        if (restriction.mute && !currentRestriction?.mute && member.voice.serverMute) {
            await member.voice.setMute(false, 'Özel odadan ayrıldığı için susturma kaldırıldı').catch(() => null);
        }
        if (restriction.deaf && !currentRestriction?.deaf && member.voice.serverDeaf) {
            await member.voice.setDeaf(false, 'Özel odadan ayrıldığı için sağırlaştırma kaldırıldı').catch(() => null);
        }
    }, VOICE_RESTRICTION_RELEASE_DELAY);
}

function deleteMessageLater(message, delay) {
    setTimeout(() => {
        message.delete().catch((error) => {
            if (error?.code !== 'ChannelNotCached' && error?.code !== 10008 && error?.code !== 10003) console.error(error);
        });
    }, delay);
}

function denyRoomTextMessages(perms, everyoneId, botId) {
    let everyonePerm = perms.find((perm) => perm.id === everyoneId);
    if (!everyonePerm) {
        everyonePerm = { id: everyoneId, allow: [], deny: [] };
        perms.push(everyonePerm);
    }

    perms.forEach((perm) => {
        if (perm.id === botId) return;
        perm.allow = (perm.allow || []).filter((permission) => !isSendMessagesPermission(permission));
        if (!(perm.deny || []).some((permission) => isSendMessagesPermission(permission))) perm.deny.push(Flags.SendMessages);
    });
}

function allowBotRoomPanel(perms, botId) {
    let botPerm = perms.find((perm) => perm.id === botId);
    if (!botPerm) {
        botPerm = { id: botId, allow: [], deny: [] };
        perms.push(botPerm);
    }
    botPerm.deny = (botPerm.deny || []).filter((permission) => !isSendMessagesPermission(permission));
    botPerm.allow.push(Flags.ViewChannel, Flags.SendMessages);
}

function isSendMessagesPermission(permission) {
    return permission === Flags.SendMessages || permission === 'SendMessages' || String(permission) === String(Flags.SendMessages);
}

async function sendRoomControlButtons(client, channel) {
    const eChange = findEmoji(client, 'wencyChange') || '✏️';
    const eLimit = findEmoji(client, 'wencyLimit') || '👥';
    const eLock = findEmoji(client, 'wencyLock') || '🔒';
    const eVisible = findEmoji(client, 'wencyVisible') || '👁️';
    const eMember = findEmoji(client, 'wencyMember') || '🧩';
    const eInfo = findEmoji(client, 'wencyInfo') || '📋';
    const eDeny = findEmoji(client, 'wencyDeny') || '🔕';
    const eCrown = findEmoji(client, 'wencyCrown') || '👑';
    const eTrash = findEmoji(client, 'wencyTrash') || '🗑️';

    return channel.send({
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('changeName').setEmoji(eChange).setLabel('İsim Değiştir').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('changeLimit').setEmoji(eLimit).setLabel('Limit Ayarla').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('roomInfo').setEmoji(eInfo).setLabel('Oda Bilgisi').setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lockOrUnlock').setEmoji(eLock).setLabel('Kilitle / Aç').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('addOrRemove').setEmoji(eMember).setLabel('Üye İzni').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('denyMember').setEmoji(eDeny).setLabel('Üyeyi Yasakla').setStyle(ButtonStyle.Secondary),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('visibleOrInvisible').setEmoji(eVisible).setLabel('Görünürlük').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('transferOwner').setEmoji(eCrown).setLabel('Devret').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('deleteRoom').setEmoji(eTrash).setLabel('Odayı Sil').setStyle(ButtonStyle.Danger),
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('moveRoomTop').setEmoji('⬆️').setLabel('Odayı Üste Taşı').setStyle(ButtonStyle.Secondary),
            ),
        ],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}

function findEmoji(client, name) {
    return client.emojis.cache.find((emoji) => emoji.name === name)?.id || null;
}

async function grantRoomOwnerVoicePermissions(channel, ownerId) {
    if (!channel) return;
    const overwrite = channel.permissionOverwrites.cache.get(ownerId);
    const required = [Flags.MoveMembers, Flags.MuteMembers, Flags.DeafenMembers];
    if (required.every((permission) => overwrite?.allow.has(permission))) return;
    await channel.permissionOverwrites.edit(ownerId, {
        [Flags.MoveMembers]: true,
        [Flags.MuteMembers]: true,
        [Flags.DeafenMembers]: true,
    }, { reason: 'Özel oda sahibi ses yönetim izinleri' }).catch(() => null);
}
