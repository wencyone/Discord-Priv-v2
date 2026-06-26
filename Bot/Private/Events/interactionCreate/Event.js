const { Events, ModalBuilder, ActionRowBuilder, TextInputStyle, TextInputBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, EmbedBuilder, BaseInteraction, PermissionFlagsBits, bold, ButtonBuilder, ButtonStyle } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const { handleGiveawayButton } = require('../../../Base/Giveaway');

const inviteRegex = /\b(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite)\/([a-zA-Z0-9\-]{2,32})\b/;
const adsRegex = /([^a-zA-ZIıİiÜüĞğŞşÖöÇç\s])+/gi;
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

    if (i.isButton()) {

        for (const [id, name] of Object.entries(roles)) {
            if (i.customId === id) {
                const role = i.guild.roles.cache.find(x => x.name === name);
                if (!role) return await i.reply({ content: `${name} rolü bulunamadı.`, flags: 64 }).catch(() => null);
                if (i.member.roles.cache.find(x => x.name === name)) {
                    await i.member.roles.remove(role).catch(() => null);
                    await i.reply({ content: `${role.name} rolü üzerinden alındı.`, flags: 64 }).catch(() => null);
                } else {
                    await i.member.roles.add(role).catch(() => null);
                    await i.reply({ content: `${role.name} rolü üzerine verildi.`, flags: 64 }).catch(() => null);
                }
            }
        }

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

            i.showModal(row)

            const modalCollected = await i.awaitModalSubmit({ time: 1000 * 60 * 2 });
            const channelName = modalCollected.fields.getTextInputValue('channelName');

            if (modalCollected) {
                if (channelName.match(inviteRegex)) return await modalCollected.reply({ content: 'Özel oda isminde link kullanamazsınız.', flags: 64 });
                if (channelName.match(adsRegex)) return await modalCollected.reply({ content: 'Özel oda isminde reklam yapamazsınız.', flags: 64 });

                await channel.setName(channelName).catch((err) => console.error())

                await modalCollected.reply({
                    content: `Oda ismi başarıyla değiştirildi: ${bold(channelName)}`,
                    flags: 64
                }).catch(() => null);
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

            i.showModal(row)

            const modalCollected = await i.awaitModalSubmit({ time: 1000 * 60 * 2 });
            const channelLimit = modalCollected.fields.getTextInputValue('channelLimit');

            if (modalCollected) {
                if (isNaN(channelLimit)) return await modalCollected.reply({ content: 'Geçerli bir limit belirtmelisiniz.', flags: 64 });

                await channel.setUserLimit(channelLimit).catch((err) => console.error())

                await modalCollected.reply({
                    content: `Oda limiti başarıyla değiştirildi: ${bold(channelLimit)}`,
                    flags: 64
                }).catch(() => null);
            }
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
            } else {
                await channel.permissionOverwrites.edit(i.guild.id, { 1048576: false });
                await i.reply({ content: 'Kanal herkese kapatıldı.', flags: 64 }).catch(() => null);
            }
        }

        if (i.customId === 'visibleOrInvisible') {
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
            } else {
                await channel.permissionOverwrites.edit(i.guild.id, { 1024: false });
                await i.reply({ content: 'Kanal herkese gizlendi.', flags: 64 }).catch(() => null);
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

            const stringSelectMenu = new StringSelectMenuBuilder({
                customId: 'remove_permission',
                placeholder: 'Özel odaya izinli kullanıcılar',
                options: allowedOptions.slice(0, 25).length > 0 ? allowedOptions.slice(0, 25) : [{
                    label: 'Kimse mevcut değil',
                    value: 'none',
                    description: 'Odaya izinli kullanıcı yok.'
                }],
                disabled: allowedOptions.length === 0
            });

            const userSelectMenu = new UserSelectMenuBuilder({
                customId: 'add_permission',
                placeholder: 'Üye seç.',
                maxValues: 1
            });

            const stringSelectRow = new ActionRowBuilder().addComponents(stringSelectMenu);
            const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu);

            await i.reply({
                content: 'Aşağıdaki menüleri kullanarak kullanıcı izinlerini düzenleyin:',
                components: [stringSelectRow, userSelectRow],
                flags: 64
            });

            const collector = i.channel.createMessageComponentCollector({
                filter: i => i.user.id === i.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'remove_permission') {
                    const userId = i.values[0];
                    await channel.permissionOverwrites.edit(userId, {
                        [PermissionFlagsBits.Connect]: false
                    });
                    await i.update({
                        content: `<@${userId}> kullanıcısının özel oda izni kaldırıldı.`,
                        components: []
                    });
                } else if (i.customId === 'add_permission') {
                    const userId = i.values[0];
                    await channel.permissionOverwrites.edit(userId, {
                        [PermissionFlagsBits.Connect]: true
                    });
                    await i.update({
                        content: `<@${userId}> kullanıcısına özel odaya bağlanma izni verildi.`,
                        components: []
                    });
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

            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder({
                    customId: 'deny_member_select',
                    placeholder: 'Odaya girişi yasaklanacak üyeyi seç.',
                    maxValues: 1
                })
            );

            await i.reply({ content: 'Odaya girişi yasaklanacak üyeyi seç.', components: [row], flags: 64 });

            const collector = i.channel.createMessageComponentCollector({
                filter: (x) => x.user.id === i.user.id && x.customId === 'deny_member_select',
                time: 60000,
                max: 1
            });

            collector.on('collect', async (x) => {
                const userId = x.values[0];
                await channel.permissionOverwrites.edit(userId, {
                    [PermissionFlagsBits.Connect]: false,
                    [PermissionFlagsBits.ViewChannel]: false
                });
                await x.update({ content: `<@${userId}> kullanıcısının odaya girişi yasaklandı.`, components: [] }).catch(() => null);
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
                await channel.permissionOverwrites.edit(selectedMember.id, {
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Stream]: true,
                    [PermissionFlagsBits.Speak]: true,
                    [PermissionFlagsBits.ViewChannel]: true
                }).catch(() => null);

                await x.update({ content: `Oda sahipliği ${selectedMember} kullanıcısına devredildi.`, components: [] }).catch(() => null);
            });
        }

        if (i.customId === 'deleteRoom') {
            if (!member.voice.channel) return await i.reply({ content: `Geçerli bir ses kanalında değilsiniz. Lütfen <#${document.secretRoomChannel}> kanalına giriş yapın.`, flags: 64 });
            if (channel?.parentId !== document.secretRoomParent) return await i.reply({ content: `Bu işlem sadece özel oda kanallarında kullanılabilir: <#${document.secretRoomChannel}>`, flags: 64 });
            if (!isOwner) return await i.reply({ content: 'Bu komutu yalnızca oda sahibi kullanabilir.', flags: 64 });

            await Settings.updateOne({ id: member.guild.id }, { $pull: { privateRooms: { channel: channel.id } } });
            await i.reply({ content: 'Özel odanız silindi.', flags: 64 }).catch(() => null);
            await channel.delete().catch(() => null);
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
        }
    }
    } catch (err) {
        if (![10008, 10062].includes(err?.code)) console.error('[INTERACTION]', err);
    }
})
