const { Events, ModalBuilder, ActionRowBuilder, TextInputStyle, TextInputBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, EmbedBuilder, BaseInteraction, PermissionFlagsBits, bold, ButtonBuilder, ButtonStyle } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const { handleGiveawayButton } = require('../../../Base/Giveaway');
const { formatPrivateRoomName } = require('../../../Base/PrivateRoom');
const { getUserGuildTag } = require('../../../Base/GuildTagRole');
const { sendSecretRoomLog } = require('../../../Base/SecretRoomLog');

const inviteRegex = /\b(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite)\/([a-zA-Z0-9\-]{2,32})\b/;
const adsRegex = /([^a-zA-ZIıİiÜüĞğŞşÖöÇç\s])+/gi;
const roomContextCommands = {
    allow: 'Üyeye İzin Ver',
    deny: 'Üyeyi Engelle',
};
const ROOM_TOP_COOLDOWN = 60 * 60 * 1000;
const roles = {
    gri: 'Gri',
    siyah: 'Siyah',
    beyaz: 'Beyaz',
    kırmızı: 'Kırmızı',
    mavi: 'Mavi',
    sarı: 'Sarı',
    yeşil: 'Yeşil',
    mor: 'Mor',
    turuncu: 'Turuncu',
    pembe: 'Pembe'
};

client.on(Events.InteractionCreate, async (i = BaseInteraction.prototype) => {
    try {

    if (!i.guild) return;

    if (i.isButton() && i.customId.startsWith('giveaway_join:')) {
        await handleGiveawayButton(i);
        return;
    }

    const document = await Settings.findOne({ id: i.guild.id });
    if (!document) return;

    if (i.isStringSelectMenu() && i.customId === 'color-role-select') {
        return handleColorRole(i, i.values[0]);
    }

    if (i.isUserContextMenuCommand() && Object.values(roomContextCommands).includes(i.commandName)) {
        return handleRoomMemberPermissionContext(i, document);
    }

    if (i.isButton()) {

        if (['register', 'man', 'woman'].includes(i.customId)) {
            return i.reply({ content: 'Butonlu kayıt sistemi kapalıdır.', flags: 64 }).catch(() => null);
        }

        if (roles[i.customId]) return handleColorRole(i, i.customId);

        if (i.customId === 'register') {
            if (!i.member.roles.cache.has(document.registeredRole)) {
                await i.member.roles.add(document.registeredRole).catch(() => null);
                await i.member.roles.remove(document.unregisteredRole).catch(() => null);

                const counter = await Settings.findOneAndUpdate({ id: i.guild.id }, { $inc: { clickCount: 1 } });

                const row = new ActionRowBuilder({
                    components: [
                        new ButtonBuilder()
                            .setCustomId('register')
                            .setLabel(`Kayıt Ol`)
                            .setEmoji(`1488386602421194833`)
                            .setStyle(ButtonStyle.Secondary)
                    ]
                })

                await i.reply({ content: 'Kayıt oldunuz!', flags: 64 });
                await i.message.edit({ components: [row] });
            } else {
                await i.reply({ content: 'Zaten kayıtlısınız.', flags: 64 });
            }
        }

        if (i.customId === 'man') {
            if (!i.member.roles.cache.has(document.manRole)) {
                await i.member.roles.add(document.manRole).catch(() => null);
                await i.member.roles.remove(document.unregisteredRole).catch(() => null);

                const counter = await Settings.findOneAndUpdate({ id: i.guild.id }, { $inc: { manClickCount: 1 } });

                const row = new ActionRowBuilder({
                    components: [
                        new ButtonBuilder()
                            .setCustomId('man')
                            .setLabel(`- (${counter.manClickCount})`)
                            .setEmoji('1420101314901311500')
                            .setStyle(ButtonStyle.Primary),
    
                        new ButtonBuilder()
                            .setCustomId('woman')
                            .setLabel(`- (${document?.womanClickCount || 0})`)
                            .setEmoji('1420101480039583794')
                            .setStyle(ButtonStyle.Danger)
                    ]
                })

                await i.reply({ content: 'Erkek olarak kayıt oldunuz!', flags: 64 });
                await i.message.edit({ components: [row] });

            } else {
                await i.reply({ content: 'Zaten erkek olarak kayıtlısınız.', flags: 64 });
            }
        }

        if (i.customId === 'woman') {   
            if (!i.member.roles.cache.has(document.womanRole)) {
                await i.member.roles.add(document.womanRole).catch(() => null);
                await i.member.roles.remove(document.unregisteredRole).catch(() => null);

                const counter = await Settings.findOneAndUpdate({ id: i.guild.id }, { $inc: { womanClickCount: 1 } });

                const row = new ActionRowBuilder({
                    components: [
                        new ButtonBuilder()
                            .setCustomId('man')
                            .setLabel(`- (${document?.manClickCount || 0})`)
                            .setEmoji('1420101314901311500')
                            .setStyle(ButtonStyle.Primary),
    
                        new ButtonBuilder()
                            .setCustomId('woman')
                            .setLabel(`- (${counter.womanClickCount})`)
                            .setEmoji('1420101480039583794')
                            .setStyle(ButtonStyle.Danger)
                    ]
                })

                await i.reply({ content: 'Kız olarak kayıt oldunuz!', flags: 64 });
                await i.message.edit({ components: [row] });

            } else {
                await i.reply({ content: 'Zaten kız olarak kayıtlısınız.', flags: 64 });
            }
        }

        const member = i.guild.members.cache.get(i.user.id);
        if (!member) return;
        const channel = i.guild.channels.cache.get(member.voice.channelId);
        const existingRoom = (document.privateRooms || []).find(x => x.channel === channel?.id);
        const owner = i.guild.members.cache.get(existingRoom?.owner);
        const isOwnerVoice = owner?.voice?.channel?.id === channel?.id;
        const isOwner = owner?.id === i.user.id;

        if (i.customId === 'changeName') {
            if (!member.voice.channel) return await i.reply({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ], flags: 64
            });

            if (channel?.parentId === document.secretRoomParent && !isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. Oda sahibi odada olmadığı için aşağıdaki butonu kullanabilir.' 
                        })
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: 'claimOwnership',
                                label: 'Odayı Sahiplen',
                                style: ButtonStyle.Primary
                            })
                        )
                    ],
                    flags: 64
                });
            } else if (channel?.parentId === document.secretRoomParent && isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. ' 
                        })
                    ],
                    flags: 64
                });
            } else if (channel?.parentId !== document.secretRoomParent) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Hata!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: `Özel oda kategorisinde olmayan bir kanalda bu işlemi gerçekleştiremezsiniz. Lütfen bir özel oda kanalında deneyin:\n\n <#${document.secretRoomChannel}>`
                        })
                    ], 
                    flags: 64
                });
            }

            const row = new ModalBuilder()
                .setTitle('İsim Değiştir')
                .setCustomId('changingName')
                .setComponents(
                    new ActionRowBuilder().setComponents(new TextInputBuilder().setCustomId('channelName').setLabel('Oda ismini giriniz.').setStyle(TextInputStyle.Short)),
                );

            await i.showModal(row)

            const modalCollected = await i.awaitModalSubmit({
                time: 1000 * 60 * 2,
                filter: (interaction) => interaction.customId === 'changingName' && interaction.user.id === i.user.id
            }).catch(() => null);
            if (!modalCollected) return;
            const channelName = modalCollected.fields.getTextInputValue('channelName');

            if (modalCollected) {
                if (channelName.match(inviteRegex)) return await modalCollected.reply({ content: 'Özel oda isminde link kullanamazsınız.', flags: 64 });
                if (channelName.match(adsRegex)) return await modalCollected.reply({ content: 'Özel oda isminde reklam yapamazsınız.', flags: 64 });

                const formattedChannelName = formatPrivateRoomName(channelName);
                await channel.setName(formattedChannelName).catch((err) => console.error(err));

                await modalCollected.reply({
                    content: `Oda ismi başarıyla değiştirildi: ${bold(formattedChannelName)}`,
                    flags: 64
                }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0x22c7c9, [
                    `✏️ ${member} (${member.id}) kullanıcısı özel oda ismini **${formattedChannelName}** olarak değiştirdi!`,
                ]);
            };
        }

        if (i.customId === 'changeLimit') {
            if (!member.voice.channel) return await i.reply({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ], flags: 64
            });

            if (channel?.parentId === document.secretRoomParent && !isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. Oda sahibi odada olmadığı için aşağıdaki butonu kullanabilir.' 
                        })
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: 'claimOwnership',
                                label: 'Odayı Sahiplen',
                                style: ButtonStyle.Primary
                            })
                        )
                    ],
                    flags: 64
                });
            } else if (channel?.parentId === document.secretRoomParent && isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. ' 
                        })
                    ],
                    flags: 64
                });
            } else if (channel?.parentId !== document.secretRoomParent) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Hata!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: `Özel oda kategorisinde olmayan bir kanalda bu işlemi gerçekleştiremezsiniz. Lütfen bir özel oda kanalında deneyin:\n\n <#${document.secretRoomChannel}>`
                        })
                    ], 
                    flags: 64
                });
            }

            const row = new ModalBuilder()
                .setTitle('Limit Değiştir')
                .setCustomId('changingLimit')
                .setComponents(
                    new ActionRowBuilder().setComponents(new TextInputBuilder().setCustomId('channelLimit').setLabel('Oda limitini giriniz.').setStyle(TextInputStyle.Short)),
                );

            await i.showModal(row);

            const modalCollected = await i.awaitModalSubmit({
                time: 1000 * 60 * 2,
                filter: (interaction) => interaction.customId === 'changingLimit' && interaction.user.id === i.user.id
            }).catch(() => null);
            if (!modalCollected) return;

            const channelLimit = modalCollected.fields.getTextInputValue('channelLimit');

            if (isNaN(channelLimit)) return await modalCollected.reply({ content: 'Geçerli bir limit belirtmelisiniz.', flags: 64 });

            await channel.setUserLimit(channelLimit).catch((err) => console.error())

            await modalCollected.reply({
                content: `Oda limiti başarıyla değiştirildi: ${bold(channelLimit)}`,
                flags: 64
            }).catch(() => null);
            await sendSecretRoomLog(i.guild, member, 0x22c7c9, [
                `👥 ${member} (${member.id}) kullanıcısı ${channel} özel oda limitini **${channelLimit}** olarak ayarladı!`,
            ]);
        }

        if (i.customId === 'lockOrUnlock') {
            if (!member.voice.channel) return await i.reply({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ], flags: 64
            });

            if (channel?.parentId === document.secretRoomParent && !isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. Oda sahibi odada olmadığı için aşağıdaki butonu kullanabilir.' 
                        })
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: 'claimOwnership',
                                label: 'Odayı Sahiplen',
                                style: ButtonStyle.Primary
                            })
                        )
                    ],
                    flags: 64
                });
            } else if (channel?.parentId === document.secretRoomParent && isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. ' 
                        })
                    ],
                    flags: 64
                });
            } else if (channel?.parentId !== document.secretRoomParent) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Hata!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: `Özel oda kategorisinde olmayan bir kanalda bu işlemi gerçekleştiremezsiniz. Lütfen bir özel oda kanalında deneyin:\n\n <#${document.secretRoomChannel}>`
                        })
                    ], 
                    flags: 64
                });
            }

            const permissions = channel.permissionOverwrites.cache.get(i.guild.id);

            if (permissions && permissions.deny.has(PermissionFlagsBits.Connect)) {
                await channel.permissionOverwrites.edit(i.guild.id, { 1048576: true });
                await i.reply({ content: 'Kanal herkese açıldı.', flags: 64 }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0x45c486, [
                    `🔓 ${member} (${member.id}) kullanıcısının ${channel} özel oda kanalı herkese açılmıştır!`,
                ]);
            } else {
                await channel.permissionOverwrites.edit(i.guild.id, { 1048576: false });
                await i.reply({ content: 'Kanal herkese kapatıldı.', flags: 64 }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0x22c7c9, [
                    `🔒 ${member} (${member.id}) kullanıcısının ${channel} özel oda kanalı kilitlenmiştir!`,
                ]);
            }
        }

        if (i.customId === 'visibleOrInvisible') {
            if (!member.premiumSinceTimestamp && !member.premiumSince) {
                return await i.reply({
                    content: 'Oda görünürlüğünü yalnızca aktif boost basan üyeler değiştirebilir.',
                    flags: 64
                }).catch(() => null);
            }

            if (!member.voice.channel) return await i.reply({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ], flags: 64
            });

            if (channel?.parentId === document.secretRoomParent && !isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. Oda sahibi odada olmadığı için aşağıdaki butonu kullanabilir.' 
                        })
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: 'claimOwnership',
                                label: 'Odayı Sahiplen',
                                style: ButtonStyle.Primary
                            })
                        )
                    ],
                    flags: 64
                });
            } else if (channel?.parentId === document.secretRoomParent && isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. ' 
                        })
                    ],
                    flags: 64
                });
            } else if (channel?.parentId !== document.secretRoomParent) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Hata!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: `Özel oda kategorisinde olmayan bir kanalda bu işlemi gerçekleştiremezsiniz. Lütfen bir özel oda kanalında deneyin:\n\n <#${document.secretRoomChannel}>`
                        })
                    ], 
                    flags: 64
                });
            }

            const permissions = channel.permissionOverwrites.cache.get(i.guild.id);

            if (permissions && permissions.deny.has(PermissionFlagsBits.ViewChannel)) {
                await channel.permissionOverwrites.edit(i.guild.id, { 1024: true });
                await i.reply({ content: 'Kanal herkese görünür yapıldı.', flags: 64 }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0x45c486, [
                    `👁️ ${member} (${member.id}) kullanıcısı ${channel} özel oda kanalını görünür yaptı!`,
                ]);
            } else {
                await channel.permissionOverwrites.edit(i.guild.id, { 1024: false });
                await i.reply({ content: 'Kanal herkese gizlendi.', flags: 64 }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0x22c7c9, [
                    `🙈 ${member} (${member.id}) kullanıcısı ${channel} özel oda kanalını gizledi!`,
                ]);
            }
        }

        if (i.customId === 'addOrRemove') {
            if (!member.voice.channel) return await i.reply({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ], flags: 64
            });

            if (channel?.parentId === document.secretRoomParent && !isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. Oda sahibi odada olmadığı için aşağıdaki butonu kullanabilir.' 
                        })
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder({
                                customId: 'claimOwnership',
                                label: 'Odayı Sahiplen',
                                style: ButtonStyle.Primary
                            })
                        )
                    ],
                    flags: 64
                });
            } else if (channel?.parentId === document.secretRoomParent && isOwnerVoice && !isOwner) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Mümkün değil!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: 'Bu komutu, yalnızca ses kanalının sahibi kullanabilir. ' 
                        })
                    ],
                    flags: 64
                });
            } else if (channel?.parentId !== document.secretRoomParent) {
                return await i.reply({
                    embeds: [
                        new EmbedBuilder({
                            title: 'Hata!',
                            image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                            description: `Özel oda kategorisinde olmayan bir kanalda bu işlemi gerçekleştiremezsiniz. Lütfen bir özel oda kanalında deneyin:\n\n <#${document.secretRoomChannel}>`
                        })
                    ], 
                    flags: 64
                });
            }

            const allowedUsers = channel.permissionOverwrites.cache.filter(overwrite =>
                overwrite.allow.has(PermissionFlagsBits.Connect) && overwrite.type === 1
            );

            const allowedOptions = allowedUsers
                .filter(x => x.id !== i.user.id)
                .map(user => ({
                    label: i.guild.members.cache.get(user.id)?.displayName || `Kullanıcı: ${user.id}`,
                    value: user.id
                }));

            const removePermissionId = `remove_permission:${i.id}`;
            const addPermissionId = `add_permission:${i.id}`;
            const addPermissionById = `add_permission_id:${i.id}`;
            const removePermissionById = `remove_permission_id:${i.id}`;

            const stringSelectMenu = new StringSelectMenuBuilder({
                customId: removePermissionId,
                placeholder: 'Özel odaya izinli kullanıcılar',
                options: allowedOptions.slice(0, 25).length > 0 ? allowedOptions.slice(0, 25) : [{
                    label: 'Kimse mevcut değil',
                    value: 'none',
                    description: 'Odaya izinli kullanıcı yok.'
                }],
                disabled: allowedOptions.length === 0
            });

            const userSelectMenu = new UserSelectMenuBuilder({
                customId: addPermissionId,
                placeholder: 'Üye seç.',
                maxValues: 1
            });

            const stringSelectRow = new ActionRowBuilder().addComponents(stringSelectMenu);
            const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu);
            const idButtonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(addPermissionById)
                    .setLabel('ID ile İzin Ver')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(removePermissionById)
                    .setLabel('ID ile İzin Kaldır')
                    .setStyle(ButtonStyle.Secondary)
            );

            await i.reply({
                content: 'Aşağıdaki menüleri kullanarak kullanıcı izinlerini düzenleyin:',
                components: [stringSelectRow, userSelectRow, idButtonRow],
                flags: 64
            });

            const collector = i.channel.createMessageComponentCollector({
                filter: (x) => x.user.id === i.user.id && [removePermissionId, addPermissionId, addPermissionById, removePermissionById].includes(x.customId),
                time: 60000,
                max: 1
            });

            collector.on('collect', async (x) => {
                if (x.customId === removePermissionId) {
                    const userId = x.values[0];
                    if (userId === 'none') return await x.update({ content: 'Odaya izinli kullanıcı yok.', components: [] }).catch(() => null);

                    await channel.permissionOverwrites.edit(userId, {
                        [PermissionFlagsBits.Connect]: false
                    });
                    await x.update({
                        content: `<@${userId}> kullanıcısının özel oda izni kaldırıldı.`,
                        components: []
                    });
                    await sendSecretRoomLog(i.guild, member, 0xfee75c, [
                        `➖ ${member} (${member.id}) kullanıcısı <@${userId}> (${userId}) kullanıcısının ${channel} özel oda iznini kaldırdı!`,
                    ]);
                } else if (x.customId === addPermissionId) {
                    const userId = x.values[0];
                    await channel.permissionOverwrites.edit(userId, {
                        [PermissionFlagsBits.Connect]: true
                    });
                    await x.update({
                        content: `<@${userId}> kullanıcısına özel odaya bağlanma izni verildi.`,
                        components: []
                    });
                    await sendSecretRoomLog(i.guild, member, 0x45c486, [
                        `➕ ${member} (${member.id}) kullanıcısı <@${userId}> (${userId}) kullanıcısına ${channel} özel oda izni verdi!`,
                    ]);
                } else if ([addPermissionById, removePermissionById].includes(x.customId)) {
                    const isAdd = x.customId === addPermissionById;
                    const modalId = `room_permission_id_modal:${x.id}`;
                    const modal = new ModalBuilder()
                        .setTitle(isAdd ? 'ID ile İzin Ver' : 'ID ile İzin Kaldır')
                        .setCustomId(modalId)
                        .setComponents(
                            new ActionRowBuilder().setComponents(
                                new TextInputBuilder()
                                    .setCustomId('memberId')
                                    .setLabel('Üye ID veya mention giriniz.')
                                    .setStyle(TextInputStyle.Short)
                            )
                        );

                    await x.showModal(modal);
                    const submitted = await x.awaitModalSubmit({
                        time: 1000 * 60 * 2,
                        filter: (modalInteraction) => modalInteraction.customId === modalId && modalInteraction.user.id === x.user.id
                    }).catch(() => null);
                    if (!submitted) return;

                    const userId = getMemberIdFromInput(submitted.fields.getTextInputValue('memberId'));
                    if (!userId) return submitted.reply({ content: 'Geçerli bir üye ID belirtmelisin.', flags: 64 }).catch(() => null);

                    const selectedMember = i.guild.members.cache.get(userId) || await i.guild.members.fetch(userId).catch(() => null);
                    if (!selectedMember) return submitted.reply({ content: 'Kullanıcı bulunamadı.', flags: 64 }).catch(() => null);

                    await channel.permissionOverwrites.edit(selectedMember.id, {
                        [PermissionFlagsBits.Connect]: isAdd
                    });
                    return submitted.reply({
                        content: isAdd
                            ? `${selectedMember} kullanıcısına özel odaya bağlanma izni verildi.`
                            : `${selectedMember} kullanıcısının özel oda izni kaldırıldı.`,
                        flags: 64
                    }).catch(() => null).then(() => sendSecretRoomLog(i.guild, member, isAdd ? 0x45c486 : 0xfee75c, [
                        isAdd
                            ? `➕ ${member} (${member.id}) kullanıcısı ${selectedMember} (${selectedMember.id}) kullanıcısına ${channel} özel oda izni verdi!`
                            : `➖ ${member} (${member.id}) kullanıcısı ${selectedMember} (${selectedMember.id}) kullanıcısının ${channel} özel oda iznini kaldırdı!`,
                    ]));
                }
            });
        }

        if (i.customId === 'roomInfo') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            const allowedUsers = channel.permissionOverwrites.cache
                .filter((overwrite) => overwrite.allow.has(PermissionFlagsBits.Connect) && overwrite.type === 1 && overwrite.id !== i.user.id)
                .map((overwrite) => `<@${overwrite.id}>`);
            const deniedUsers = channel.permissionOverwrites.cache
                .filter((overwrite) => overwrite.deny.has(PermissionFlagsBits.Connect) && overwrite.type === 1)
                .map((overwrite) => `<@${overwrite.id}>`);
            const inVoice = channel.members.map((m) => `${m}`).join(', ') || 'Kimse yok.';
            const permissions = channel.permissionOverwrites.cache.get(i.guild.id);
            const isLocked = permissions?.deny.has(PermissionFlagsBits.Connect);
            const isHidden = permissions?.deny.has(PermissionFlagsBits.ViewChannel);

            return await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Oda Bilgileri')
                        .setColor(0x2f3136)
                        .setDescription([
                            `• Sahip: ${owner || member}`,
                            `• Oda: ${channel}`,
                            `• Limit: ${channel.userLimit || 'Limitsiz'}`,
                            `• Durum: ${isLocked ? 'Kapalı' : 'Açık'} / ${isHidden ? 'Gizli' : 'Görünür'}`,
                            `• Sestekiler: ${inVoice}`,
                            `• İzinliler: ${allowedUsers.join(', ') || 'Kimse yok.'}`,
                            `• Yasaklılar: ${deniedUsers.join(', ') || 'Kimse yok.'}`,
                        ].join('\n'))
                ],
                flags: 64
            });
        }

        if (i.customId === 'denyMember') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            const denyById = `deny_member_id:${i.id}`;
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder({
                    customId: 'deny_member_select',
                    placeholder: 'Odaya girişi yasaklanacak üyeyi seç.',
                    maxValues: 1
                })
            );
            const idButtonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(denyById)
                    .setLabel('ID ile Engelle')
                    .setStyle(ButtonStyle.Secondary)
            );

            await i.reply({ content: 'Odaya girişi yasaklanacak üyeyi seç.', components: [row, idButtonRow], flags: 64 });

            const collector = i.channel.createMessageComponentCollector({
                filter: (x) => x.user.id === i.user.id && ['deny_member_select', denyById].includes(x.customId),
                time: 60000,
                max: 1
            });

            collector.on('collect', async (x) => {
                if (x.customId === denyById) {
                    const modalId = `deny_member_id_modal:${x.id}`;
                    const modal = new ModalBuilder()
                        .setTitle('ID ile Üye Engelle')
                        .setCustomId(modalId)
                        .setComponents(
                            new ActionRowBuilder().setComponents(
                                new TextInputBuilder()
                                    .setCustomId('memberId')
                                    .setLabel('Üye ID veya mention giriniz.')
                                    .setStyle(TextInputStyle.Short)
                            )
                        );

                    await x.showModal(modal);
                    const submitted = await x.awaitModalSubmit({
                        time: 1000 * 60 * 2,
                        filter: (modalInteraction) => modalInteraction.customId === modalId && modalInteraction.user.id === x.user.id
                    }).catch(() => null);
                    if (!submitted) return;

                    const userId = getMemberIdFromInput(submitted.fields.getTextInputValue('memberId'));
                    if (!userId) return submitted.reply({ content: 'Geçerli bir üye ID belirtmelisin.', flags: 64 }).catch(() => null);

                    const selectedMember = i.guild.members.cache.get(userId) || await i.guild.members.fetch(userId).catch(() => null);
                    if (!selectedMember) return submitted.reply({ content: 'Kullanıcı bulunamadı.', flags: 64 }).catch(() => null);

                    await channel.permissionOverwrites.edit(selectedMember.id, {
                        [PermissionFlagsBits.Connect]: false,
                        [PermissionFlagsBits.ViewChannel]: false
                    });
                    if (selectedMember.voice.channelId === channel.id) await selectedMember.voice.disconnect('Özel oda sahibi tarafından yasaklandı.').catch(() => null);
                    await submitted.reply({ content: `${selectedMember} kullanıcısının odaya girişi yasaklandı.`, flags: 64 }).catch(() => null);
                    return sendSecretRoomLog(i.guild, member, 0xed4245, [
                        `⛔ ${member} (${member.id}) kullanıcısı ${selectedMember} (${selectedMember.id}) kullanıcısını ${channel} özel odasından engelledi!`,
                    ]);
                }

                const userId = x.values[0];
                await channel.permissionOverwrites.edit(userId, {
                    [PermissionFlagsBits.Connect]: false,
                    [PermissionFlagsBits.ViewChannel]: false
                });
                await x.update({ content: `<@${userId}> kullanıcısının odaya girişi yasaklandı.`, components: [] }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0xed4245, [
                    `⛔ ${member} (${member.id}) kullanıcısı <@${userId}> (${userId}) kullanıcısını ${channel} özel odasından engelledi!`,
                ]);
            });
        }

        if (i.customId === 'transferOwner') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder({
                    customId: 'transfer_owner_select',
                    placeholder: 'Oda sahipliğini devredeceğin üyeyi seç.',
                    maxValues: 1
                })
            );

            await i.reply({ content: 'Oda sahipliğini devredeceğin üyeyi seç.', components: [row], flags: 64 });

            const collector = i.channel.createMessageComponentCollector({
                filter: (x) => x.user.id === i.user.id && x.customId === 'transfer_owner_select',
                time: 60000,
                max: 1
            });

            collector.on('collect', async (x) => {
                const userId = x.values[0];
                const selectedMember = i.guild.members.cache.get(userId) || await i.guild.members.fetch(userId).catch(() => null);
                if (!selectedMember) return await x.update({ content: 'Kullanıcı bulunamadı.', components: [] }).catch(() => null);

                await Settings.updateOne(
                    { id: member.guild.id, 'privateRooms.channel': channel.id },
                    { $set: { 'privateRooms.$.owner': selectedMember.id } }
                );
                await channel.permissionOverwrites.edit(member.id, {
                    [PermissionFlagsBits.MoveMembers]: null,
                    [PermissionFlagsBits.MuteMembers]: null,
                    [PermissionFlagsBits.DeafenMembers]: null
                }).catch(() => null);
                await channel.permissionOverwrites.edit(selectedMember.id, {
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Stream]: true,
                    [PermissionFlagsBits.Speak]: true,
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.MoveMembers]: true,
                    [PermissionFlagsBits.MuteMembers]: true,
                    [PermissionFlagsBits.DeafenMembers]: true
                }).catch(() => null);

                await x.update({ content: `Oda sahipliği ${selectedMember} kullanıcısına devredildi.`, components: [] }).catch(() => null);
                await sendSecretRoomLog(i.guild, member, 0xfee75c, [
                    `👑 ${member} (${member.id}) kullanıcısı ${channel} özel oda sahipliğini ${selectedMember} (${selectedMember.id}) kullanıcısına devretti!`,
                ]);
            });
        }

        if (i.customId === 'deleteRoom') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            await Settings.updateOne({ id: member.guild.id }, { $pull: { privateRooms: { channel: channel.id } } });
            await i.reply({ content: 'Özel odanız silindi.', flags: 64 }).catch(() => null);
            await sendSecretRoomLog(i.guild, member, 0xed4245, [
                `🗑️ ${member} (${member.id}) kullanıcısı **${channel.name}** özel odasını sildi!`,
            ]);
            await channel.delete().catch(() => null);
        }

        if (i.customId === 'moveRoomTop') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            return moveRoomTop(i, member, channel);
        }

        if (i.customId === 'claimOwnership') {
            if (!member.voice.channel) return await i.update({
                embeds: [
                    new EmbedBuilder({
                        title: 'Kanal Bulunamadı!',
                        image: { url: 'https://tempvoice.xyz/embeds/discord/copyright-fail.png' },
                        description: `Geçerli bir ses kanalında değilsiniz. Lütfen bir ses kanalına katıldığınızdan emin olun:\n\n <#${document.secretRoomChannel}>`,
                    })
                ],
                components: []
            });

            await Settings.updateOne(
                { 
                    id: member.guild.id,
                    'privateRooms.channel': channel.id 
                },
                { 
                    $set: { 'privateRooms.$.owner': member.id }
                }
            );

            await i.update({ embeds: [], content: 'Oda artık size ait.', components: [] }).catch(() => null);
            await sendSecretRoomLog(i.guild, member, 0xfee75c, [
                `👑 ${member} (${member.id}) kullanıcısı ${channel} özel oda sahipliğini üstlendi!`,
            ]);
        }
    }
    } catch (err) {
        if (![10008, 10062].includes(err?.code)) console.error('[INTERACTION]', err);
    }
})

async function handleColorRole(interaction, selectedColor) {
    const colorRoles = Object.values(roles)
        .map((name) => interaction.guild.roles.cache.find((role) => role.name === name))
        .filter(Boolean);
    const memberColorRoles = colorRoles.filter((role) => interaction.member.roles.cache.has(role.id));

    if (selectedColor === 'clear') {
        if (memberColorRoles.length) await interaction.member.roles.remove(memberColorRoles).catch(() => null);
        return interaction.reply({ content: 'Tüm renk rollerin temizlendi.', flags: 64 }).catch(() => null);
    }

    const roleName = roles[selectedColor];
    const selectedRole = colorRoles.find((role) => role.name === roleName);
    if (!selectedRole) return interaction.reply({ content: `${roleName} rolü bulunamadı.`, flags: 64 }).catch(() => null);

    const removeSelected = interaction.member.roles.cache.has(selectedRole.id);
    if (memberColorRoles.length) await interaction.member.roles.remove(memberColorRoles).catch(() => null);

    if (removeSelected) {
        return interaction.reply({ content: `${selectedRole.name} renk rolün kaldırıldı.`, flags: 64 }).catch(() => null);
    }

    await interaction.member.roles.add(selectedRole).catch(() => null);
    return interaction.reply({ content: `${selectedRole.name} renk rolü verildi.`, flags: 64 }).catch(() => null);
}

async function getRoomContext(interaction, document, targetId = interaction.targetId) {
    const member = interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member?.voice?.channel) return { error: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.` };

    const channel = interaction.guild.channels.cache.get(member.voice.channelId);
    if (channel?.parentId !== document.secretRoomParent) {
        return { error: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>` };
    }

    const room = (document.privateRooms || []).find((item) => item.channel === channel.id);
    if (!room) return { error: 'Bu oda özel oda sisteminde kayıtlı değil.' };
    if (room.owner !== member.id) return { error: 'Bu işlemi yalnızca oda sahibi kullanabilir.' };

    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) return { error: 'Seçilen kullanıcı bulunamadı.' };

    return { member, channel, room, target };
}

async function handleRoomMemberPermissionContext(interaction, document) {
    const context = await getRoomContext(interaction, document);
    if (context.error) return interaction.reply({ content: context.error, flags: 64 }).catch(() => null);

    const { member, channel, target } = context;
    if (target.id === member.id) return interaction.reply({ content: 'Kendi oda iznini bu menüden düzenleyemezsin.', flags: 64 }).catch(() => null);

    if (interaction.commandName === roomContextCommands.deny) {
        await channel.permissionOverwrites.edit(target.id, {
            [PermissionFlagsBits.Connect]: false,
            [PermissionFlagsBits.ViewChannel]: false,
        });
        if (target.voice.channelId === channel.id) await target.voice.disconnect('Özel oda sahibi tarafından engellendi.').catch(() => null);
        await interaction.reply({ content: `${target} kullanıcısının odaya girişi engellendi.`, flags: 64 }).catch(() => null);
        return sendSecretRoomLog(interaction.guild, member, 0xed4245, [
            `⛔ ${member} (${member.id}) kullanıcısı ${target} (${target.id}) kullanıcısını ${channel} özel odasından engelledi!`,
        ]);
    }

    if (interaction.commandName === roomContextCommands.allow) {
        await channel.permissionOverwrites.edit(target.id, {
            [PermissionFlagsBits.Connect]: true,
            [PermissionFlagsBits.ViewChannel]: true,
        });
        await interaction.reply({ content: `${target} kullanıcısına özel odaya giriş izni verildi.`, flags: 64 }).catch(() => null);
        return sendSecretRoomLog(interaction.guild, member, 0x45c486, [
            `➕ ${member} (${member.id}) kullanıcısı ${target} (${target.id}) kullanıcısına ${channel} özel oda izni verdi!`,
        ]);
    }
}

async function moveRoomTop(interaction, member, channel) {
    const user = await interaction.client.users.fetch(member.id, { force: true }).catch(() => member.user);
    const guildTag = getUserGuildTag(user, interaction.guild.id);
    if (!guildTag) {
        return interaction.reply({ content: 'Bu işlemi yalnızca sunucunun guild tagini alan üyeler kullanabilir.', flags: 64 }).catch(() => null);
    }

    const settings = await Settings.findOne({ id: member.guild.id }).lean().catch(() => null);
    const cooldownRecord = (settings?.privateRoomTopMoves || []).find((item) => item.userId === member.id);
    const lastMovedAt = getTimestamp(cooldownRecord?.lastMovedAt);
    const now = Date.now();
    const availableAt = lastMovedAt + ROOM_TOP_COOLDOWN;
    if (lastMovedAt && availableAt > now) {
        return interaction.reply({
            content: `Odayı tekrar üste taşımak için ${formatRemaining(availableAt - now)} beklemelisin.`,
            flags: 64,
        }).catch(() => null);
    }

    const createRoomChannel = interaction.guild.channels.cache.get(settings?.secretRoomChannel)
        || await interaction.guild.channels.fetch(settings?.secretRoomChannel).catch(() => null);
    if (!createRoomChannel || createRoomChannel.parentId !== channel.parentId) {
        return interaction.reply({ content: 'Özel oda oluştur kanalı bulunamadı.', flags: 64 }).catch(() => null);
    }

    const moved = await channel.setPosition(createRoomChannel.position + 1, { reason: `${member.user.tag} özel odasını üste taşıdı.` })
        .then(() => true)
        .catch((error) => {
            console.error('[ROOM_MOVE_TOP]', error);
            return false;
        });
    if (!moved) return interaction.reply({ content: 'Oda üste taşınırken bir hata oluştu.', flags: 64 }).catch(() => null);
    await Settings.updateOne(
        { id: member.guild.id },
        { $pull: { privateRoomTopMoves: { userId: member.id } } }
    ).catch(() => null);
    await Settings.updateOne(
        { id: member.guild.id },
        { $push: { privateRoomTopMoves: { userId: member.id, lastMovedAt: now } } },
        { upsert: true }
    ).catch(() => null);

    await interaction.reply({ content: `${channel} odası özel oda oluştur kanalının altına taşındı.`, flags: 64 }).catch(() => null);
    return sendSecretRoomLog(interaction.guild, member, 0x5865f2, [
        `⬆️ ${member} (${member.id}) kullanıcısı ${channel} özel odasını üste taşıdı!`,
    ]);
}

function getTimestamp(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatRemaining(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? `${minutes} dakika ${seconds} saniye` : `${seconds} saniye`;
}

function getMemberIdFromInput(input) {
    const match = String(input || '').trim().match(/\d{17,20}/);
    return match ? match[0] : null;
}
