const { channelCreate, channelDelete, channelUpdate, channelOverwriteCreate, channelOverwriteDelete, channelOverwriteUpdate, emojiCreate, emojiDelete, emojiUpdate, roleCreate, roleDelete, roleUpdate, stickerCreate, stickerDelete, stickerUpdate, webhookCreate, webhookDelete, webhookUpdate, memberBan, memberUnban, memberKick, memberRoleUpdate, memberUpdate, guildUpdate, botAdd } = require('./Server Watcher');
const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, TextInputBuilder, TextInputStyle, ModalBuilder, Events, AuditLogEvent, codeBlock, PermissionsBitField, EmbedBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ActionRowBuilder, ChannelType, PermissionOverwriteManager, PermissionOverwrites, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, RoleSelectMenuBuilder } = require('discord.js');
const config = require('../../../System');
const { Driver } = require('cherry3');
const Settings = require('../../Schema/GuardSettings');
const roleModel = require('../../Schema/RoleModel');
const channelModel = require('../../Schema/ChannelModel')
const { scheduleJob } = require('node-schedule');
const { expressionBackup, roleBackup, channelBackup, createRole, createChannel, createExpression } = require('../Utils/Functions');
const { startVoiceConnectionMonitor } = require('../../Base/VoiceConnection');
const { attachClientErrorHandlers, startWithRetry } = require('../../Base/Startup');
const guardCommands = [
	require('./Commands/Guard/Whitelist'),
	require('./Commands/Guard/Settings'),
	require('./Commands/Guard/Audit')
];
require('colors');
const client = new Client({
	intents: Object.keys(GatewayIntentBits),
	partials: Object.keys(Partials),
	rest: { version: 10, hashLifetime: Infinity },
	presence: { status: config.Presence.Status, activities: [{ name: config.Presence.Message[Math.floor(Math.random() * config.Presence.Message.length)], type: config.Presence.Type, url: 'https://www.twitch.tv/wencycuk' }] },
	ws: { version: 10, properties: { $browser: 'discord.js' } }
});
attachClientErrorHandlers(client, 'Logger');

client.on(Events.ClientReady, async () => {

	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return;

	startVoiceConnectionMonitor(client, guild, config.channelID, 'Logger');

	const guardSettings = await Settings.findOne({ guildID: guild.id });
	if (!guardSettings) {
		await Settings.create({
			guildID: guild.id,
			blackListedChannels: [],
			blackListedRoles: [],
			rolePermissions: [],
			whitelist: []
		});
	}

	await runAutomaticBackup(guild);
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || !message.guild) return;

	if (!config.ownerID.includes(message.author.id)) return;
	if (message.content.startsWith(config.Security.Prefix)) {
		const args = message.content.slice(1).trim().split(/ +/g);
		const cmd = args.shift().toLowerCase();
		if (!cmd) return;
		const guardCommand = guardCommands.find((command) => command.name === cmd || command.aliases?.includes(cmd));
		if (guardCommand) {
			await guardCommand.execute(client, message, args);
			return;
		}

		if (cmd === 'wl') {
			if (!['ekle', 'çıkar', 'liste'].some(x => args[0] == x)) return message.reply({ content: `Lütfen geçerli bir işlem belirtin. \`ekle\`, \`çıkar\`, \`liste\`` })

			if (args[0] === 'ekle') {

				const row = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('addRole')
						.setLabel('Rol Ekle')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId('addUser')
						.setLabel('Üye Ekle')
						.setStyle(ButtonStyle.Primary)
				);

				const msg = await message.channel.send({
					content: `Whitelist'e ne eklemek istiyorsunuz?`,
					components: [row]
				});

				const collector = msg.createMessageComponentCollector({
					filter: i => i.user.id === message.author.id, time: 45000
				});

				collector.on('collect', async i => {
					if (i.customId === 'addRole' || i.customId === 'addUser') {
						i.deferUpdate();

						const row = i.customId === 'addRole'
							? new RoleSelectMenuBuilder().setCustomId('whitelistRole').setPlaceholder('Rol Seç').setMaxValues(1)
							: new UserSelectMenuBuilder().setCustomId('whitelistUser').setPlaceholder('Kullanıcı Seç').setMaxValues(1);

						const selectionRow = new ActionRowBuilder().addComponents(row);

						await msg.edit({
							content: `Lütfen whitelist eklemek istediğiniz ${i.customId === 'addRole' ? 'rolü' : 'kullanıcıyı'} seçiniz.`,
							components: [selectionRow]
						});

						const selectionCollector = msg.createMessageComponentCollector({
							filter: i => i.user.id === message.author.id, time: 45000
						});

						selectionCollector.on('collect', async i => {
							if (i.customId === 'whitelistRole' || i.customId === 'whitelistUser') {
								i.deferUpdate();
								const value = i.values[0];

								const typeRow = new ActionRowBuilder().addComponents(
									new StringSelectMenuBuilder()
										.setCustomId('whitelistType')
										.setPlaceholder('Whitelist Türü Seç')
										.addOptions([
											{ label: 'Full (Riskli)', value: 'full' },
											{ label: 'Sunucu Güncellemeleri', value: 'guildUpdate' },
											{ label: 'Üye Güncellemeleri', description: 'Rol, isim, mute, sağırlaştırma, ban ve kick', value: 'memberUpdate' },
											{ label: 'Kanal', value: 'channel' },
											{ label: 'Rol', value: 'role' },
											{ label: 'Emoji/Sticker', value: 'emoji' },
										])
								);

								await msg.edit({
									content: `Lütfen whitelist türünü seçiniz.`,
									components: [typeRow]
								});

								const typeCollector = msg.createMessageComponentCollector({
									filter: i => i.user.id === message.author.id, time: 45000
								});

								typeCollector.on('collect', async i => {
									if (i.customId === 'whitelistType') {
										i.deferUpdate();
										const type = i.values[0];

										const limitRow = new ActionRowBuilder().addComponents(
											new StringSelectMenuBuilder()
												.setCustomId('limitSelect')
												.setPlaceholder('Limit Seç')
												.addOptions([
													{ label: 'Sınırsız', value: '0' },
													{ label: '5', value: '5' },
													{ label: '10', value: '10' },
													{ label: '15', value: '15' },
													{ label: '20', value: '20' },
													{ label: '25', value: '25' },
													{ label: '50', value: '50' },
													{ label: '100', value: '100' },
													{ label: '200', value: '200' },
													{ label: '500', value: '500' },
													{ label: '1000', value: '1000' },
												])
										);

										await msg.edit({
											content: `Lütfen whitelist limiti seçiniz.`,
											components: [limitRow]
										});

										const limitCollector = msg.createMessageComponentCollector({
											filter: i => i.user.id === message.author.id, time: 45000
										});

										limitCollector.on('collect', async i => {
											if (i.customId === 'limitSelect') {
												i.deferUpdate();
												const limit = i.values[0];

												const punishRow = new ActionRowBuilder().addComponents(
													new StringSelectMenuBuilder()
														.setCustomId('punishSelect')
														.setPlaceholder('Ceza Seç')
														.addOptions([
															{ label: 'Ban', value: 'ban' },
															{ label: 'Kick', value: 'kick' },
															{ label: 'Y.Çek', value: 'pull' },
														])
												);

												await msg.edit({
													content: `Lütfen ceza tipini seçiniz.`,
													components: [punishRow]
												});

												const punishCollector = msg.createMessageComponentCollector({
													filter: i => i.user.id === message.author.id, time: 45000
												});

												punishCollector.on('collect', async i => {
													if (i.customId === 'punishSelect') {
														i.deferUpdate();
														const punish = i.values[0];

														const document = await Settings.findOne({ guildID: message.guild.id })
														if (!document || !document.whitelist) {
															await Settings.create({ guildID: message.guild.id, whitelist: [{ key: value, access: [{ type, limit, punish }] }] });
															await msg.edit({ content: `Whitelist başarıyla eklendi!`, components: [] });
															return;
														}

														const findOld = document.whitelist.find((x) => x.key === value);
														if (findOld) {
															const sameType = findOld.access.find((x) => x.type === type);
															if (sameType) {
																sameType.limit = limit;
																sameType.punish = punish;
																await Settings.updateOne({ guildID: message.guild.id }, { $set: { whitelist: document.whitelist } });
																await msg.edit({ content: `Whitelist başarıyla güncellendi!`, components: [] });
																return;
															};

															findOld.access.push({ type, limit, punish });
															await Settings.updateOne({ guildID: message.guild.id }, { $set: { whitelist: document.whitelist } });
															await msg.edit({ content: `Whitelist başarıyla güncellendi!`, components: [] });
															return;
														}

														document.whitelist.push({ key: value, access: [{ type, limit, punish }] });
														await Settings.updateOne({ guildID: message.guild.id }, { $set: { whitelist: document.whitelist } });

														await msg.edit({ content: `Whitelist başarıyla eklendi!`, components: [] });
													}
												});
											}
										})
									}
								})
							}
						});
					}
				});
			} else if (args[0] === 'çıkar') {

				const row = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('removeRole')
						.setLabel('Rol Çıkar')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId('removeUser')
						.setLabel('Üye Çıkar')
						.setStyle(ButtonStyle.Primary)
				);

				const msg = await message.channel.send({
					content: `Whitelist'den ne çıkarmak istiyorsunuz?`,
					components: [row]
				});

				const collector = msg.createMessageComponentCollector({
					filter: i => i.user.id === message.author.id, time: 45000
				});

				collector.on('collect', async i => {
					if (i.customId === 'removeRole' || i.customId === 'removeUser') {
						i.deferUpdate();

						const row = i.customId === 'removeRole'
							? new RoleSelectMenuBuilder().setCustomId('whitelistRole').setPlaceholder('Rol Seç').setMaxValues(1)
							: new UserSelectMenuBuilder().setCustomId('whitelistUser').setPlaceholder('Kullanıcı Seç').setMaxValues(1);

						const selectionRow = new ActionRowBuilder().addComponents(row);

						await msg.edit({
							content: `Lütfen whitelist çıkarmak istediğiniz ${i.customId === 'removeRole' ? 'rolü' : 'kullanıcıyı'} seçiniz.`,
							components: [selectionRow]
						});

						const selectionCollector = msg.createMessageComponentCollector({
							filter: i => i.user.id === message.author.id, time: 45000
						});

						selectionCollector.on('collect', async i => {
							if (i.customId === 'whitelistRole' || i.customId === 'whitelistUser') {
								i.deferUpdate();
								const value = i.values[0];

								const document = await Settings.findOne({ guildID: message.guild.id })
								if (!document || !document.whitelist) return;

								const findOld = document.whitelist.find((x) => x.key === value);
								if (!findOld) return await msg.edit({ content: `Whitelist bulunamadı!`, components: [] });

								document.whitelist = document.whitelist.filter((x) => x.key !== value);
								await Settings.updateOne({ guildID: message.guild.id }, { $set: { whitelist: document.whitelist } });

								await msg.edit({ content: `Whitelist başarıyla çıkarıldı!`, components: [] });
							}
						});
					}
				})
			} else if (args[0] === 'liste') {

				const document = await Settings.findOne({ guildID: message.guild.id })
				if (!document || !document.whitelist) return;

				const whitelistData = document.whitelist.map((x) => {
					const roleOrUserName = message.guild?.roles.cache.has(x.key)
						? message.guild?.roles.cache.get(x.key)?.name
						: message.guild?.members.cache.get(x.key)?.user?.username;

					const name = roleOrUserName || 'Bulunamadı';

					const roleOrUserType = message.guild?.roles.cache.has(x.key) ? '(Rol)' : '(Kullanıcı)';

					const accessContent = x.access.map((y) => {
						const limit = Number(y.limit) === 0 ? 'Sınırsız' : (y.limit || 'Limit yok');
						const type = y.type || 'Bilinmiyor'
						const punish = y.punish || 'Bilinmiyor';
						const typeNames = {
							full: 'Full Erişim',
							guildUpdate: 'Sunucu Güncellemeleri',
							memberUpdate: 'Üye Güncellemeleri',
							channel: 'Kanal',
							role: 'Rol',
							emoji: 'Emoji/Sticker'
						};
						return [
							`→ Tip: ${typeNames[type] || type}`,
							`→ Limit: ${limit}`,
							`→ Ceza: ${punish === 'pull' ? 'Y.Çek' : punish === 'ban' ? 'Ban' : 'Kick'}`
						].join('\n');
					}).join('\n\n');

					return accessContent
						? codeBlock('yaml', [`# ${name} ${roleOrUserType}`, accessContent].join('\n'))
						: null;
				}).filter(Boolean);

				if (whitelistData.length === 0) {
					return await message.reply({ content: 'Whitelist bulunamadı.' });
				}

				let page = 1;
				const totalData = Math.ceil(whitelistData.length / 5);

				const question = await message.channel.send({
					embeds: [new EmbedBuilder({ description: whitelistData.slice(0, 5).join('\n') })],
					components: totalData > 1 ? [getButton(page, totalData)] : []
				})

				const collector = question.createMessageComponentCollector({
					filter: i => i.user.id === message.author.id, time: 60000
				});

				collector.on('collect', async i => {
					if (i.customId === 'first') page = 1;
					if (i.customId === 'previous') page -= 1;
					if (i.customId === 'next') page += 1;
					if (i.customId === 'last') page = totalData;

					await i.deferUpdate();
					await question.edit({
						embeds: [new EmbedBuilder({ description: whitelistData.slice((page - 1) * 5, page * 5).join('\n') })],
						components: [getButton(page, totalData)]
					});
				});
			}
		}

		if (cmd === 'denetim') {

			const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('roleControl')
						.setLabel('Rol Denetim')
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId('channelControl')
						.setLabel('Kanal Denetim')
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId('emojiControl')
						.setLabel('Emoji/Sticker Denetim')
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId('banControl')
						.setLabel('Ban Denetim')
						.setStyle(ButtonStyle.Secondary),
				)

			const question = await message.channel.send({
				components: [row]
			}).catch((error) => {
				console.error(`[DENETIM] Panel gonderilemedi: ${error.message}`);
				return null;
			});
			if (!question) return;

			const collector = question.createMessageComponentCollector({
				filter: i => i.user.id === message.author.id, time: 60000
			});

			collector.on('collect', async i => {
				await i.deferUpdate();
				if (i.customId === 'roleControl') {
					let arr = [];
					const roleLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete }).catch(() => null);
					const roleAudit = roleLogs?.entries.filter((x) => x.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24) || [];
					roleAudit.forEach((x) => {
						const roleName = x.changes.find((change) => change.key === 'name')?.old;
						if (roleName) {
							arr.push({
								label: roleName,
								value: `role-${x.targetId}`,
								description: `${x.targetId} ID'li Rol`
							})
						}
					})

					if (arr.length > 0) {
						const newQuestion = await question.channel.send({
							embeds: [
								new EmbedBuilder({
									footer: { text: `Son 24 Saat İçinde Silinmiş Roller`, iconURL: message.guild.iconURL({ dynamic: true }) },
									description: `${arr.slice(0, 20).map((entry) => `\`${entry.label} (${entry.value.slice(5)})\``).join('\n')}`
								})
							],
							components: [
								new ActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setCustomId('roleCreate')
										.setLabel('Rol Kur')
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId('allRoleCreate')
										.setLabel('Tüm Rolleri Kur')
										.setStyle(ButtonStyle.Secondary)
								)
								]
							}).catch(err => { })
							if (!newQuestion) return;

							const roleCollector = newQuestion.createMessageComponentCollector({
							filter: i => i.user.id === message.author.id, time: 60000
						});

						roleCollector.on('collect', async i => {
							if (i.customId === 'roleCreate') {
								const idInputRow = new ActionRowBuilder({
									components: [
										new TextInputBuilder({
											custom_id: 'id',
											label: 'Rol ID',
											placeholder: '123456789123456789',
											style: TextInputStyle.Short,
											required: true
										})
									]
								});

								await i.showModal(
									new ModalBuilder({
										custom_id: 'modal',
										title: 'Silinen Rolü Kur',
										components: [idInputRow]
									})
								);

									const modalCollected = await i.awaitModalSubmit({ time: 1000 * 60 }).catch(() => null);
								if (modalCollected) {
									const roleId = modalCollected.fields.getTextInputValue('id')
									const document = await roleModel.findOne({ guild: message.guild.id, role: roleId });
									if (!document) return await modalCollected.reply({ content: 'Rol veritabanında bulunamadı!', components: [], flags: 64 }).catch(err => { });
									const restoredRole = await createRole(client, document, true);
									await modalCollected.reply({ content: restoredRole ? 'Rol ve üye dağıtımı başarıyla geri yüklendi!' : 'Rol geri yüklenemedi. Bot rol sırasını ve yetkilerini kontrol edin.', components: [], flags: 64 }).catch(err => { });
								}
							} else if (i.customId === 'allRoleCreate') {
								await i.deferReply({ flags: 64 }).catch(() => null);
								const roleIds = [...new Set(arr.map((entry) => entry.value.slice(5)))];
								const documents = [];

								for (const roleId of roleIds) {
									const document = await roleModel.findOne({ guild: message.guild.id, role: roleId }).catch(() => null);
									if (document) documents.push(document);
								}

								let success = 0;
								let failed = 0;
								for (const document of documents.sort((a, b) => (a.position || 0) - (b.position || 0))) {
									const restoredRole = await createRole(client, document, true).catch(() => null);
									if (restoredRole) success++;
									else failed++;
								}

								await i.editReply({
									content: `Toplu rol yedeği tamamlandı. Başarılı: ${success}, Başarısız: ${failed}, Veritabanında yok: ${roleIds.length - documents.length}`
								}).catch(() => null);
							}
						});
					} else {
						question.edit({ content: `Silinmiş Rol Bulunamadı.`, embeds: [], components: [] }).catch(err => { });
					}
				} else if (i.customId === 'channelControl') {
					let arr = [];
					const channelLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete }).catch(() => null);
					const channelAudit = channelLogs?.entries.filter((x) => x.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24) || [];
					channelAudit.forEach((x) => {
						const channelName = x.changes.find((change) => change.key === 'name')?.old;
						if (channelName) {
							arr.push({
								label: channelName,
								value: `channel-${x.targetId}`,
								description: `${x.targetId} ID'li Kanal`,
								time: x.createdTimestamp
							})
						}
					})

					if (arr.length > 0) {
						const newQuestion = await question.channel.send({
							embeds: [
								new EmbedBuilder({
									footer: { text: `Son 24 Saat İçinde Silinmiş Kanallar`, iconURL: message.guild.iconURL({ dynamic: true }) },
									description: `${arr.slice(0, 20).map((entry) => `\`${entry.label} (${entry.value.slice(8)})\` <t:${Math.floor(entry.time / 1000)}>`).join('\n')}`
								})
							],
							components: [
								new ActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setCustomId('channelCreate')
										.setLabel('Kanal Kur')
										.setStyle(ButtonStyle.Secondary),
									new ButtonBuilder()
										.setCustomId('allChannelCreate')
										.setLabel('Tüm Kanalları Kur')
										.setStyle(ButtonStyle.Secondary)
								)
							]
						}).catch((error) => {
							console.error(`[DENETIM] Kanal paneli gonderilemedi: ${error.message}`);
							return null;
						});
						if (!newQuestion) return;

						const channelCollector = newQuestion.createMessageComponentCollector({
							filter: i => i.user.id === message.author.id, time: 60000
						});

						channelCollector.on('collect', async i => {
							if (i.customId === 'channelCreate') {
								const idInputRow = new ActionRowBuilder({
									components: [
										new TextInputBuilder({
											custom_id: 'id',
											label: 'Kanal ID',
											placeholder: '123456789123456789',
											style: TextInputStyle.Short,
											required: true
										})
									]
								});

								await i.showModal(
									new ModalBuilder({
										custom_id: 'modal',
										title: 'Silinen Kanalı Kur',
										components: [idInputRow]
									})
								);

								const modalCollected = await i.awaitModalSubmit({
									filter: (i) => i.user.id === message.author.id,
									time: 1000 * 60 * 5,
								}).catch(() => null);

								if (modalCollected) {
									const channelId = modalCollected.fields.getTextInputValue('id')
									const document = await channelModel.findOne({ guild: message.guild.id, channel: channelId });
									if (!document) return await modalCollected.reply({ content: 'Kanal veritabanında bulunamadı!', components: [], flags: 64 }).catch(err => { });
									await createChannel(client, document);
									await modalCollected.reply({ content: 'Kanal başarıyla oluşturuldu!', components: [], flags: 64 }).catch(err => { });
								}

							} else if (i.customId === 'allChannelCreate') {
								await i.deferReply({ flags: 64 }).catch(() => null);
								const channelIds = [...new Set(arr.map((entry) => entry.value.slice(8)))];
								const firstDocuments = [];

								for (const channelId of channelIds) {
									const document = await channelModel.findOne({ guild: message.guild.id, channel: channelId }).catch(() => null);
									if (document) firstDocuments.push(document);
								}

								const categoryIds = new Set(firstDocuments.filter((document) => document.type === ChannelType.GuildCategory).map((document) => document.channel));
								let success = 0;
								let failed = 0;

								for (const document of firstDocuments.filter((document) => document.type === ChannelType.GuildCategory).sort((a, b) => (a.position || 0) - (b.position || 0))) {
									const restoredChannel = await createChannel(client, document).catch(() => null);
									if (restoredChannel) success++;
									else failed++;
								}

								const otherChannelIds = channelIds.filter((channelId) => !categoryIds.has(channelId));
								const otherDocuments = [];
								for (const channelId of otherChannelIds) {
									const document = await channelModel.findOne({ guild: message.guild.id, channel: channelId }).catch(() => null);
									if (document) otherDocuments.push(document);
								}

								for (const document of otherDocuments.sort((a, b) => (a.position || 0) - (b.position || 0))) {
									const restoredChannel = await createChannel(client, document).catch(() => null);
									if (restoredChannel) success++;
									else failed++;
								}

								await i.editReply({
									content: `Toplu kanal yedeği tamamlandı. Başarılı: ${success}, Başarısız: ${failed}, Veritabanında yok: ${channelIds.length - firstDocuments.length}`
								}).catch(() => null);
							}
						});

					} else {
						question.edit({ content: `Silinmiş Kanal Bulunamadı.`, embeds: [], components: [] }).catch(err => { });
					}
					} else if (i.customId === 'emojiControl') {
						const arr = [];
						const emojiLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete }).catch(() => null);
						const emojiAudit = emojiLogs?.entries.filter((x) => x.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24) || [];
					emojiAudit.forEach((x) => {
						if (x.changes.filter((y) => y.key == 'name').map((z) => z?.old)) {
							arr.push({
								label: `${x.changes.filter((y) => y.key == 'name').map((z) => z.old)[0]}`,
								time: x.createdTimestamp,
								value: `emoji-${x.targetId}`,
								description: `${x.targetId} ID'li Emoji`,
								type: 'emoji',
							});
						}
					});

						const stickerLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.StickerDelete }).catch(() => null);
						const stickerAudit = stickerLogs?.entries.filter((x) => x.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24) || [];
					stickerAudit.forEach((x) => {
						if (x.changes.filter((y) => y.key == 'name').map((z) => z?.old)) {
							arr.push({
								label: `${x.changes.filter((y) => y.key == 'name').map((z) => z.old)[0]}`,
								time: x.createdTimestamp,
								value: `sticker-${x.targetId}`,
								description: `${x.targetId} ID'li Sticker`,
								type: 'emoji',
							});
						}
					});

					if (arr.length > 0) {
						arr.sort((a, b) => b.time - a.time);
						const newQuestion = await question.channel.send({
							embeds: [
								new EmbedBuilder({
									footer: { text: `Son 24 Saat İçinde Silinmiş Emoji/Sticker`, iconURL: message.guild.iconURL({ dynamic: true }) },
									description: `${arr.map((x) => `\`${x.label} (${x.description})\` <t:${Math.floor(x.time / 1000)}>`).join('\n')}`
								})
							],
							components: [
								new ActionRowBuilder({
									components: [
										new ButtonBuilder({
											customId: 'emojiCreate',
											label: 'Emoji Kur',
											style: ButtonStyle.Secondary
										}),

										new ButtonBuilder({
											customId: 'stickerCreate',
											label: 'Sticker Kur',
											style: ButtonStyle.Secondary
										})
									]
								})
							]
						}).catch(err => { });

							if (!newQuestion) return;

							const expressionCollector = newQuestion.createMessageComponentCollector({
							filter: i => i.user.id === message.author.id, time: 60000
						});

						expressionCollector.on('collect', async i => {
							if (i.customId === 'emojiCreate') {

								const idInputRow = new ActionRowBuilder({
									components: [
										new TextInputBuilder({
											custom_id: 'id',
											label: 'Emoji ID',
											placeholder: '123456789123456789',
											style: TextInputStyle.Short,
											required: true
										})
									]
								});

								await i.showModal(
									new ModalBuilder({
										custom_id: 'modal',
										title: 'Silinen Emojiyi Kur',
										components: [idInputRow]
									})
								);

								const modalCollected = await i.awaitModalSubmit({ time: 1000 * 60 }).catch(() => null);
								if (modalCollected) {
									const emojiId = modalCollected.fields.getTextInputValue('id')
									await createExpression(client, emojiId, 'emoji');
									await modalCollected.reply({ content: 'Emoji başarıyla oluşturuldu!', components: [], flags: 64 }).catch(err => { });
								}
							} else if (i.customId === 'stickerCreate') {
								const idInputRow = new ActionRowBuilder({
									components: [
										new TextInputBuilder({
											custom_id: 'id',
											label: 'Sticker ID',
											placeholder: '123456789123456789',
											style: TextInputStyle.Short,
											required: true
										})
									]
								});

								await i.showModal(
									new ModalBuilder({
										custom_id: 'modal',
										title: 'Silinen Stickerı Kur',
										components: [idInputRow]
									})
								);

								const modalCollected = await i.awaitModalSubmit({ time: 1000 * 60 }).catch(() => null);
								if (modalCollected) {
									const stickerId = modalCollected.fields.getTextInputValue('id')
									await createExpression(client, stickerId, 'sticker');
									await modalCollected.reply({ content: 'Sticker başarıyla oluşturuldu!', components: [], flags: 64 }).catch(err => { });
								}
							}
						})
					} else {
						question.edit({ content: `Son 24 saat içinde silinmiş **emoji/sticker** bulunamadı.`, embeds: [], components: [] }).catch(err => { });
					}
					} else if (i.customId === 'banControl') {
						const arr = [];
						const banLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd }).catch(() => null);
						const banAudit = banLogs?.entries.filter((x) => x.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24) || [];
					banAudit.forEach((x) => {
						arr.push({
							label: `${x.target.username}`,
							time: x.createdTimestamp,
							value: `ban-${x.targetId}`,
							description: `${x.targetId} ID'li Üye`,
						});
					});

					if (arr.length > 0) {
						arr.sort((a, b) => b.time - a.time);
						question.edit({
							embeds: [
								new EmbedBuilder({
									footer: { text: `Son 24 Saat İçinde Banlanmış Üyeler`, iconURL: message.guild.iconURL({ dynamic: true }) },
									description: `${arr.map((x) => `\`${x.label} (${x.description})\` <t:${Math.floor(x.time / 1000)}>`).join('\n')}`
								})
							],
							components: []
						}).catch(err => { });
					} else {
						question.edit({ content: `Son 24 saat içinde banlanmış üye bulunamadı.`, embeds: [], components: [] }).catch(err => { });
					}
				}
			})
		}

		if (cmd === 'ayarlar') {

			const row = new ActionRowBuilder()
				.addComponents(
					new StringSelectMenuBuilder({
						custom_id: 'settings',
						placeholder: 'Bir Ayar Seçin',
						options: [
							{
								label: 'Kanal Backup',
								value: 'channel_backup',
								emoji: '🔄',
							},
							{
								label: 'Rol Backup',
								value: 'role_backup',
								emoji: '🔄',
							},
							{
								label: 'Blacklist Rolleri',
								value: 'blacklist_roles',
								emoji: '🛡️',
							},
							{
								label: 'Blacklist Kanalları',
								value: 'blacklist_channels',
								emoji: '🛡️'
							},
							{
								label: 'Yetki İşlemleri',
								value: 'authority_operations',
								emoji: '⚙️',
							},
						]
					})
				)

			const question = await message.channel.send({
				components: [row]
			}).catch((error) => {
				console.error(`[AYARLAR] Panel gonderilemedi: ${error.message}`);
				return null;
			});
			if (!question) return;

			const collector = question.createMessageComponentCollector({
				filter: i => i.user.id === message.author.id, time: 60000
			});

			collector.on('collect', async i => {
				await i.deferUpdate();

				if (i.values[0] === 'channel_backup') {
					await channelBackup(message.guild);
					question.reply({ content: 'Kanal Yedeği Başarıyla Alındı!', components: [] }).catch(err => { });
				} else if (i.values[0] === 'role_backup') {
					await roleBackup(message.guild);
					question.reply({ content: 'Rol Yedeği Başarıyla Alındı!', components: [] }).catch(err => { });
				} else if (i.values[0] === 'blacklist_channels') {

					const data = await Settings.findOne({ guildID: message.guild.id })

					const blackListChannels = [...new Set((data?.blackListedChannels || []).flat(Infinity).map((x) => x?.id || x).filter(Boolean))];

					const stringSelectMenu = new StringSelectMenuBuilder({
						custom_id: 'remove_channel',
						placeholder: 'Kanal seç..',
						options: blackListChannels.length > 0 ? blackListChannels.slice(0, 25).map((x) => {
							return {
								label: message.guild.channels.cache.get(x)?.name || '#deleted-channel',
								description: 'Kaldırmak için tıklayın.',
								value: x,
							}
						}) : [{ label: 'Kanal Bulunamadı.', value: 'null' }],
						disabled: blackListChannels.length === 0
					});

					const channelSelectMenu = new ChannelSelectMenuBuilder()
						.setCustomId('add_channel')
						.setPlaceholder('Kanal ara..')
						.setMinValues(1)
						.setMaxValues(25);

					const stringRow = new ActionRowBuilder().addComponents(stringSelectMenu);
					const channelRow = new ActionRowBuilder().addComponents(channelSelectMenu);

						const msg = await question.reply({
							content: 'Kara Listeye Alınacak Kanalları Seçin',
							components: [stringRow, channelRow]
						}).catch(err => { })
						if (!msg) return;

					const collector = msg.createMessageComponentCollector({
						filter: i => i.user.id === message.author.id, time: 60000
					});

					collector.on('collect', async i => {
						await i.deferUpdate();
						if (i.customId === 'remove_channel') {
							const filterData = blackListChannels.filter((x) => x !== i.values[0]);
							await Settings.updateOne({ guildID: message.guild.id }, { $set: { blackListedChannels: filterData.map((x) => { return { id: x } }) } }, { $upsert: true });
							await msg.edit({ content: 'Kanal Kara Listeden Kaldırıldı!', components: [] }).catch(err => { });
						} else if (i.customId === 'add_channel') {
							const value = [...new Set([...blackListChannels, ...i.values])];
							await Settings.updateOne({ guildID: message.guild.id }, { $set: { blackListedChannels: value.map((id) => ({ id })) } }, { $upsert: true });
							await msg.edit({ content: 'Kanal Kara Listeye Eklendi!', components: [] }).catch(err => { });
						}
					});
				} else if (i.values[0] === 'blacklist_roles') {
					const data = await Settings.findOne({ guildID: message.guild.id })

					const blackListRoles = [...new Set((data?.blackListedRoles || []).flat(Infinity).map((x) => x?.id || x).filter(Boolean))];

					const stringSelectMenu = new StringSelectMenuBuilder({
						custom_id: 'remove_role',
						placeholder: 'Rol seç..',
						options: blackListRoles.length > 0 ? blackListRoles.slice(0, 25).map((x) => {
							return {
								label: message.guild.roles.cache.get(x)?.name || `Silinmiş Rol (${x.slice(-6)})`,
								description: 'Kaldırmak için tıklayın.',
								value: x,
							}
						}) : [{ label: 'Rol Bulunamadı.', value: 'null' }],
						disabled: blackListRoles.length === 0
					});

					const roleSelectMenu = new RoleSelectMenuBuilder()
						.setCustomId('add_role')
						.setPlaceholder('Rol ara..')
						.setMinValues(1)
						.setMaxValues(25);

					const stringRow = new ActionRowBuilder().addComponents(stringSelectMenu);
					const roleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

						const msg = await question.reply({
							content: 'Kara Listeye Alınacak Rolleri Seçin',
							components: [stringRow, roleRow]
						}).catch(err => { })
						if (!msg) return;

					const collector = msg.createMessageComponentCollector({
						filter: i => i.user.id === message.author.id, time: 60000
					});

					collector.on('collect', async i => {
						await i.deferUpdate();
						if (i.customId === 'remove_role') {
							const filterData = blackListRoles.filter((x) => x !== i.values[0]);
							await Settings.updateOne({ guildID: message.guild.id }, { $set: { blackListedRoles: filterData.map((x) => { return { id: x } }) } }, { $upsert: true });
							await msg.edit({ content: 'Rol Kara Listeden Kaldırıldı!', components: [] }).catch(err => { });
						} else if (i.customId === 'add_role') {
							const value = [...new Set([...blackListRoles, ...i.values])];
							await roleBackup(message.guild);
							await Settings.updateOne({ guildID: message.guild.id }, { $set: { blackListedRoles: value.map((id) => ({ id })) } }, { $upsert: true });
							await msg.edit({ content: 'Rol Kara Listeye Eklendi!', components: [] }).catch(err => { });
						}
					});
				} else if (i.values[0] === 'authority_operations') {

						const data = await Settings.findOne({ guildID: message.guild.id });
						if (!data) return question.reply({ content: 'Yetki İşlemleri ayarları bulunamadı.', components: [] });
						const savedRolePermissions = Array.isArray(data.rolePermissions) ? data.rolePermissions.flat(Infinity) : [];

						const msg = await question.reply({
						content: 'Sunucuda bulunan rollerde ki yetkileri açmak veya kapatmak için aşağıda ki butonları kullanınız.',
						components: [
							new ActionRowBuilder({
								components: [
									new ButtonBuilder({
										custom_id: 'open',
										label: 'Yetkileri Aç',
										style: ButtonStyle.Danger,
										disabled: savedRolePermissions.length === 0
									}),

									new ButtonBuilder({
										custom_id: 'close',
										label: 'Yetkileri Kapat',
										style: ButtonStyle.Danger,
										disabled: savedRolePermissions.length > 0
									})
								]
							})
							]
						}).catch(err => { });
						if (!msg) return;

					const collector = msg.createMessageComponentCollector({
						filter: i => i.user.id === message.author.id, time: 60000
					});

					collector.on('collect', async i => {
						await i.deferUpdate();
						if (i.customId === 'open') {
								for (const p of savedRolePermissions) {
								const role = message.guild.roles.cache.get(p.role);
								if (!role?.editable) continue;
								await role.setPermissions(new PermissionsBitField(p.permissions)).catch(() => null);
							}

							await Settings.updateOne({ guildID: message.guild.id }, { $set: { rolePermissions: [] } }, { $upsert: true });
							await msg.edit({ content: 'Yetkiler başarıyla açıldı.', components: [] }).catch(err => { });
						} else if (i.customId === 'close') {
							let perms = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers];
							const dangerRoles = message.guild.roles.cache.filter((r) => perms.some((perm) => r.permissions.has(perm)) && r.editable);
							const permissionBackup = [];
	
							for (const r of dangerRoles.values()) {
								permissionBackup.push({
									role: r.id,
									permissions: r.permissions.bitfield.toString(),
								})
					
								await r.setPermissions(PermissionsBitField.Flags.SendMessages).catch(() => { });
							}
							await Settings.updateOne(
								{ guildID: message.guild.id },
								{ $set: { rolePermissions: permissionBackup } },
								{ $upsert: true }
							);

							await msg.edit({ content: 'Yetkiler başarıyla kapatıldı.', components: [] }).catch(err => { });
						}
					});
				}
			})
		}
	}
});

client.on(Events.GuildAuditLogEntryCreate, async (audit, guild) => {
	const type = audit.action;
	const changes = audit.changes;
	const member = guild.members.cache.get(audit?.executorId)
		|| await guild.members.fetch(audit?.executorId).catch(() => null);
	if (!member) return console.warn(`[GUARD AUDIT] İşlemi yapan üye bulunamadı: ${audit?.executorId || 'Bilinmiyor'}`);

	if (type === AuditLogEvent.ChannelCreate) await channelCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.ChannelDelete) await channelDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.ChannelUpdate) await channelUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.ChannelOverwriteCreate) await channelOverwriteCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.ChannelOverwriteDelete) await channelOverwriteDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.ChannelOverwriteUpdate) await channelOverwriteUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.EmojiCreate) await emojiCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.EmojiDelete) await emojiDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.EmojiUpdate) await emojiUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.RoleCreate) await roleCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.RoleDelete) await roleDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.RoleUpdate) await roleUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.StickerCreate) await stickerCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.StickerDelete) await stickerDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.StickerUpdate) await stickerUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.WebhookCreate) await webhookCreate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.WebhookDelete) await webhookDelete(client, guild, audit, member, changes);
	if (type === AuditLogEvent.WebhookUpdate) await webhookUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.MemberBanAdd) await memberBan(client, guild, audit, member, changes);
	if (type === AuditLogEvent.MemberBanRemove) await memberUnban(client, guild, audit, member, changes);
	if (type === AuditLogEvent.MemberKick) await memberKick(client, guild, audit, member, changes);
	if (type === AuditLogEvent.MemberRoleUpdate) await memberRoleUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.MemberUpdate) await memberUpdate(client, guild, audit, member, changes);
	if (type === AuditLogEvent.BotAdd) await botAdd(client, guild, audit, member, changes);
	if (type === AuditLogEvent.GuildUpdate) await guildUpdate(client, guild, audit, member, changes);
});

async function start() {
    await startWithRetry('Logger', async () => {
        await Driver.authenticate();
        console.log('[DATABASE] Ortak Guard veritabanı bağlantısı başarılı.');
        await client.login(config.Security.Logger);
        console.log(`[BOT] ${client.user.tag} olarak giriş yaptı!`);
    });
}

start();

let backupRunning = false;

async function runAutomaticBackup(guild) {
	if (!guild || backupRunning) return false;
	backupRunning = true;

	const startedAt = Date.now();
	const backupId = `${startedAt.toString(36)}-${guild.id.slice(-6)}`;
	console.log(`[AUTO BACKUP] Yeni sunucu yedeği alınıyor! ID: ${backupId}`);

	try {
		await roleBackup(guild);
		await channelBackup(guild);
		await expressionBackup(guild);

		const completedAt = Date.now();
		const unix = Math.floor(completedAt / 1000);
		const duration = Math.max(1, Math.ceil((completedAt - startedAt) / 1000));
		const logChannel = guild.channels.cache.find((channel) => channel.name === 'backup-log' && channel.isTextBased());

		if (logChannel) {
			const separator = '────────────────────────';
			const embed = new EmbedBuilder()
				.setTitle('Sunucu Yedeği Oluşturuldu')
				.setDescription([
					'',
					separator,
					'',
					'✅ **Backup Bilgisi**',
					'',
					`• Backup ID: \`${backupId}\``,
					`• Sunucu: **${guild.name}** (\`${guild.id}\`)`,
					`• Tarih ve Saat: <t:${unix}:F>`,
					`• Oluşturulma: <t:${unix}:R>`,
					`• Tür: **Otomatik**`,
					`• İşlem Süresi: **${duration} saniye**`,
					'',
					separator,
					'',
					'✅ **Yedeklenen Veriler**',
					'',
					`• Roller: **${guild.roles.cache.size}**`,
					`• Rol Üyelikleri: **${guild.roles.cache.reduce((total, role) => total + role.members.size, 0)}**`,
					`• Kanallar: **${guild.channels.cache.size}**`,
					`• Emojiler: **${guild.emojis.cache.size}**`,
					`• Stickerlar: **${guild.stickers.cache.size}**`,
					'',
					separator
				].join('\n'))
				.setTimestamp(completedAt);

			await logChannel.send({ embeds: [embed] });
		} else {
			console.log('[AUTO BACKUP] backup-log kanalı bulunamadı; yedek veritabanına kaydedildi.');
		}

		console.log(`[AUTO BACKUP] Sunucu yedeği başarıyla tamamlandı. ID: ${backupId}`);
		return true;
	} catch (error) {
		console.error(`[AUTO BACKUP] Yedekleme başarısız: ${error.message}`);
		return false;
	} finally {
		backupRunning = false;
	}
}

scheduleJob('0 0 */2 * * *', async function () {
	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return;
	await runAutomaticBackup(guild);
});

function getButton(page, total) {
	return new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('first')
				.setEmoji('⏮️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 1),
			new ButtonBuilder()
				.setCustomId('previous')
				.setEmoji('⬅️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 1),
			new ButtonBuilder()
				.setCustomId('count')
				.setLabel(`${page}/${total}`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId('next')
				.setEmoji('➡️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(total === page),
			new ButtonBuilder()
				.setCustomId('last')
				.setEmoji('⏭️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === total),
		);
}
