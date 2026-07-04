const { channelCreate, channelDelete, channelUpdate, channelOverwriteCreate, channelOverwriteDelete, channelOverwriteUpdate, emojiCreate, emojiDelete, emojiUpdate, roleCreate, roleDelete, roleUpdate, stickerCreate, stickerDelete, stickerUpdate, webhookCreate, webhookDelete, webhookUpdate, memberBan, memberUnban, memberRoleUpdate, memberUpdate, guildUpdate, botAdd } = require('./Server Watcher');
const { Client, GatewayIntentBits, Partials, ActivityType, Events, AuditLogEvent, codeBlock, PermissionsBitField, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ChannelType, PermissionOverwriteManager, PermissionOverwrites } = require('discord.js');
const config = require('../../../System');
const { Driver } = require('cherry3');
const Settings = require('../../Schema/GuardSettings');
const roleModel = require('../../Schema/RoleModel');
const { startDists, roleBackup, createRole, distributeRoleMembers } = require('../Utils/Functions');
const { connectBotToVoice } = require('../../Base/VoiceConnection');

require('colors');
const client = new Client({
    intents: Object.keys(GatewayIntentBits),
    partials: Object.keys(Partials),
    rest: { version: 10, hashLifetime: Infinity },
	presence: { status: config.Presence.Status, activities: [{ name: config.Presence.Message[Math.floor(Math.random() * config.Presence.Message.length)], type: config.Presence.Type, url: 'https://www.twitch.tv/wencycuk' }] },
    ws: { version: 10, properties: { $browser: 'discord.js' } }
});

let pendingRestoreScanRunning = false;

async function resumePendingRoleRestores(guild) {
    if (!guild || pendingRestoreScanRunning) return;
    pendingRestoreScanRunning = true;
    try {
        const settings = await Settings.findOne({ guildID: guild.id }).catch(() => null);
        const protectedRoleIds = [...new Set((settings?.blackListedRoles || [])
            .flat(Infinity)
            .map((item) => item?.id || item)
            .filter(Boolean))];

        for (const roleId of protectedRoleIds) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;
            const backup = await roleModel.findOne({ guild: guild.id, role: roleId }).catch(() => null);
            const pendingMembers = [...new Set(backup?.pendingMembers || [])];
            if (!pendingMembers.length) continue;

            console.log(`[ROLE RESTORE QUEUE] ${role.name}: ${pendingMembers.length} bekleyen uye yeniden deneniyor.`);
            await distributeRoleMembers(client, role, pendingMembers, backup.name || role.name, true);
        }
    } finally {
        pendingRestoreScanRunning = false;
    }
}

client.on(Events.ClientReady, async () => {

    const guild = client.guilds.cache.get(config.serverID);
    if (!guild) return;

    await connectBotToVoice(client, guild, config.channelID, 'Backup');

    let guardSettings = await Settings.findOne({ guildID: guild.id });
    if (!guardSettings) {
        guardSettings = await Settings.create({
            guildID: guild.id,
            blackListedChannels: [],
            blackListedRoles: [],
            rolePermissions: [],
            whitelist: []
        });
    }

    // Guard kapaliyken silinen korumali rolleri de acilista geri getir.
    const protectedRoleIds = [...new Set((guardSettings?.blackListedRoles || [])
        .flat(Infinity)
        .map((item) => item?.id || item)
        .filter(Boolean))];

    for (const roleId of protectedRoleIds) {
        const backup = await roleModel.findOne({ guild: guild.id, role: roleId }).catch(() => null);
        const existingRole = guild.roles.cache.get(roleId);
        if (existingRole) {
            const pendingMembers = [...new Set(backup?.pendingMembers || [])];
            if (pendingMembers.length) {
                console.log(`[ROLE RESTORE STARTUP] ${existingRole.name}: ${pendingMembers.length} bekleyen uye dagitimina devam ediliyor.`);
                await distributeRoleMembers(client, existingRole, pendingMembers, backup.name || existingRole.name, true);
            }
            continue;
        }
        if (!backup) {
            console.warn(`[ROLE RESTORE STARTUP] ${roleId} ID'li korumali rolun yedegi bulunamadi.`);
            continue;
        }
        await createRole(client, backup, true);
    }

    // Mevcut rollerin renk, sira, izin, kanal overwrite ve uye listesini
    // kurtarma botu her acildiginda tazele.
    await roleBackup(guild);

    const distributors = await startDists(config.Security.Dists).catch(() => []);
    console.log(`[DISTS]: ${distributors.length}/${config.Security.Dists.length} dağıtıcı online.`);
});

setInterval(async () => {
    const guild = client.guilds.cache.get(config.serverID);
    await resumePendingRoleRestores(guild);
}, 60000);

client.on(Events.GuildAuditLogEntryCreate, async (audit, guild) => {
    const type = audit.action;
    const changes = audit.changes;
    const member = guild.members.cache.get(audit?.executorId)
        || await guild.members.fetch(audit?.executorId).catch(() => null);
    if (!member) return console.warn(`[GUARD AUDIT] İşlemi yapan üye bulunamadı: ${audit?.executorId || 'Bilinmiyor'}`);

    const document = await Settings.findOne({ guildID: guild.id });
    if (!document) return;

    if (type === AuditLogEvent.ChannelCreate) await channelCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.ChannelDelete) await channelDelete(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.ChannelUpdate) await channelUpdate(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.ChannelOverwriteCreate) await channelOverwriteCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.ChannelOverwriteDelete) await channelOverwriteDelete(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.ChannelOverwriteUpdate) await channelOverwriteUpdate(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.EmojiCreate) await emojiCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.EmojiDelete) await emojiDelete(client, guild, audit, member, changes);
    if (type === AuditLogEvent.EmojiUpdate) await emojiUpdate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.RoleCreate) await roleCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.RoleDelete) await roleDelete(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.RoleUpdate) await roleUpdate(client, guild, audit, member, changes, document);
    if (type === AuditLogEvent.StickerCreate) await stickerCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.StickerDelete) await stickerDelete(client, guild, audit, member, changes);
    if (type === AuditLogEvent.StickerUpdate) await stickerUpdate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.WebhookCreate) await webhookCreate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.WebhookDelete) await webhookDelete(client, guild, audit, member, changes);
    if (type === AuditLogEvent.WebhookUpdate) await webhookUpdate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.MemberBanAdd) await memberBan(client, guild, audit, member, changes);
    if (type === AuditLogEvent.MemberBanRemove) await memberUnban(client, guild, audit, member, changes);
    if (type === AuditLogEvent.MemberRoleUpdate) await memberRoleUpdate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.MemberUpdate) await memberUpdate(client, guild, audit, member, changes);
    if (type === AuditLogEvent.BotAdd) await botAdd(client, guild, audit, member, changes);
    if (type === AuditLogEvent.GuildUpdate) await guildUpdate(client, guild, audit, member, changes);
});

async function start() {
    try {
        await Driver.authenticate();
        console.log('[DATABASE] Ortak Guard veritabanı bağlantısı başarılı.');
        await client.login(config.Security.Backup);
        console.log(`[BOT] ${client.user.tag} olarak giriş yaptı!`);
    } catch (error) {
        console.error(`[STARTUP] Backup bot başlatılamadı: ${error.message}`);
        process.exitCode = 1;
    }
}

start();
