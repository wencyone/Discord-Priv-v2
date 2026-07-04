const { PermissionFlagsBits, PermissionsBitField, ChannelType, Client, GatewayIntentBits, Partials, Collection, GuildPremiumTier } = require('discord.js');

const config = require('../../../System');
const roleModel = require('../../Schema/RoleModel');
const expressionModel = require('../../Schema/ExpressionModel');
const channelModel = require('../../Schema/ChannelModel');
const Settings = require('../../Schema/GuardSettings');

const limits = new Collection()
const voiceBitrates = {
	[GuildPremiumTier.None]: 64000,
	[GuildPremiumTier.Tier1]: 128000,
	[GuildPremiumTier.Tier2]: 256000,
	[GuildPremiumTier.Tier3]: 384000,
};

function date(date) {	
	return new Date(date).toLocaleString('tr-TR', {
		month: '2-digit',
		day: '2-digit',
		year: 'numeric',
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
	});
};

const distClients = new Map();
const distLoginPromises = new Map();
const activeRoleRestores = new Set();

async function startDists(tokens = []) {
	const bots = [];
	const cleanTokens = [...new Set((Array.isArray(tokens) ? tokens : []).map((token) => String(token || '').trim()).filter(Boolean))];

	for (const token of cleanTokens) {
		const cachedClient = distClients.get(token);
		if (cachedClient?.isReady()) {
			bots.push(Promise.resolve(cachedClient));
			continue;
		}
		const pendingLogin = distLoginPromises.get(token);
		if (pendingLogin) {
			bots.push(pendingLogin);
			continue;
		}

		const loginPromise = new Promise((resolve) => {
				const distClient = new Client({
					intents: Object.keys(GatewayIntentBits),
					partials: Object.keys(Partials),
					presence: { status: 'online' },
				});

				let settled = false;
				const finish = (client = null) => {
					if (settled) return;
					settled = true;
					distLoginPromises.delete(token);
					resolve(client);
				};

				distClients.set(token, distClient);

				const timeout = setTimeout(() => {
					console.log('[DISTS]: Login timeout.');
					distClients.delete(token);
					distClient.destroy();
					finish(null);
				}, 15000);

				distClient.once('ready', () => {
					clearTimeout(timeout);
					const guild = distClient.guilds.cache.get(config.serverID);
					if (!guild) {
						console.log(`[DISTS]: ${distClient.user.username} is not in server!`);
						distClients.delete(token);
						distClient.destroy();
						return finish(null);
					}

					finish(distClient);
				});

				distClient.on('rateLimit', (rateLimitData) => {
					console.log(
						`[DISTS]: ${distClient.user.username} rate limited caught. Retrying in ${Math.round(
							rateLimitData.timeout / 1000,
						)} seconds.`,
					);
				});

				distClient.login(token).then(() => {
					console.log(`[DISTS]: ${distClient.user.username} is online.`);
				}).catch((error) => {
					clearTimeout(timeout);
					distClients.delete(token);
					console.error(`[DISTS]: Token login failed: ${error.code || error.message}`);
					finish(null);
				});
			});
		distLoginPromises.set(token, loginPromise);
		bots.push(loginPromise);
	}

	return (await Promise.all(bots)).filter(Boolean);
}

async function channelBackup(guild) {
	await Promise.all(guild.channels.cache.map(async (channel) => {

		const messages = [];
		let fetchComplete = false;
		let lastMessageId;
		var fetchOptions = { limit: 35 };

		if (channel.isTextBased()) {
			while (!fetchComplete) {
				if (lastMessageId) {
					fetchOptions.before = lastMessageId;
				}
				var fetchedMessages = await channel.messages.fetch(fetchOptions).catch(() => null);
				if (!fetchedMessages || fetchedMessages.size === 0) {
					fetchComplete = true;
					break;
				}

				lastMessageId = fetchedMessages.last()?.id;
				for (var message of [...fetchedMessages.values()]) {
					messages.push({
						content: message.content,
						username: message.author.displayName,
						avatarURL: message.author.displayAvatarURL(),
						pinned: message.pinned,
						embeds: message.embeds,
						files: await Promise.all(
							message.attachments.map(async (attachment) => {
								let attach = attachment.url;
								if (attachment.url && ['png', 'jpg', 'jpeg', 'jpe', 'jif', 'jfif', 'jfi'].includes(attachment.url)) {
									attach = await axios.get(attachment.url, { responseType: 'arraybuffer' }).then((response) => {
										return `data:${response.headers['content-type']};base64,${Buffer.from(response.data).toString('base64')}`;
									}).catch(() => { return attachment.url; });
								};
								return {
									name: attachment.name,
									attachment: attach,
								};
							}),
						),
					});
				}
			};
		};

		await channelModel.findOneAndUpdate(
			{ guild: config.serverID, channel: channel?.id },
			{
				$set: {
					guild: config.serverID,
					channel: channel?.id,
					isDeleted: false,
					deletedTimestamp: undefined,
					name: channel?.name,
					type: channel?.type,
					topic: channel?.topic,
					position: channel?.position,
					nsfw: channel?.nsfw,
					messages: messages,
					bitrate: channel?.bitrate,
					userLimit: channel?.userLimit,
					rateLimitPerUser: channel?.rateLimitPerUser || 0,
					parentId: channel?.parent?.id,
					permissionOverwrites: channel.permissionOverwrites.cache.map((perm) => ({
						id: perm.id,
						type: perm.type,
						allow: new PermissionsBitField(perm.allow).toArray(),
						deny: new PermissionsBitField(perm.deny).toArray()
					})),
				}
			},
			{ $upsert: true }
		).catch((err) => console.log(err));
	}));
}

async function expressionBackup(guild) {
	await Promise.all(guild.emojis.cache.map(async (emoji) => {
		await expressionModel.findOneAndUpdate(
			{ guild: config.serverID, expression: emoji.id },
			{
				$set: {
					guild: config.serverID,
					expression: emoji.id,
					name: emoji.name,
					url: emoji.url,
					animated: emoji.animated ? true : false
				}
			},
			{ $upsert: true }
		).catch((err) => { });
	}));

	await Promise.all(guild.stickers.cache.map(async (sticker) => {
		await expressionModel.findOneAndUpdate(
			{ guild: config.serverID, expression: sticker.id },
			{
				$set: {
					guild: config.serverID,
					expression: sticker.id,
					name: sticker.name,
					url: sticker.url,
					description: sticker.description,
					tags: sticker.tags,
					animated: sticker.format === '4' ? true : false
				}
			},
			{ $upsert: true }
		).catch((err) => console.log(err));
	}));
}

async function backupRole(guild, roleOrId, options = {}) {
	if (!guild?.id) return null;

	const roleId = roleOrId?.id || roleOrId;
	const role = guild.roles.cache.get(roleId)
		|| await guild.roles.fetch(roleId).catch(() => null);
	if (!role || role.managed || role.id === guild.id) return null;

	const rolePerms = [];
	role.guild.channels.cache
		.filter((channel) => channel?.permissionOverwrites?.cache.has(role.id))
		.forEach((channel) => {
			const channelPerm = channel.permissionOverwrites.cache.get(role.id);
			rolePerms.push({
				id: channel.id,
				allow: channelPerm.allow.toArray(),
				deny: channelPerm.deny.toArray()
			});
		});

	const backup = {
		guild: guild.id,
		role: role.id,
		isDeleted: false,
		deletedTimestamp: undefined,
		name: role.name,
		icon: role.iconURL({ extension: 'png', size: 1024 }),
		unicodeEmoji: role.unicodeEmoji || null,
		color: role.color,
		hoist: role.hoist,
		position: role.rawPosition,
		permissions: role.permissions.bitfield.toString(),
		mentionable: role.mentionable,
		channelOverwrites: rolePerms
	};

	if (options.includeMembers) {
		const existing = await roleModel.findOne({ guild: guild.id, role: role.id }).catch(() => null);
		const liveMembers = role.members.map((member) => member.id);
		if (Array.isArray(existing?.pendingMembers) && existing.pendingMembers.length) {
			backup.members = [...new Set([...(existing.members || []), ...liveMembers])];
			backup.pendingMembers = [...new Set(existing.pendingMembers || [])];
		} else {
			backup.members = liveMembers;
			backup.pendingMembers = [];
		}
	}

	await roleModel.findOneAndUpdate(
		{ guild: guild.id, role: role.id },
		{ $set: backup },
		{ $upsert: true }
	).catch((error) => {
		console.error(`[ROLE BACKUP] ${role.name} rolu yedeklenemedi: ${error.message}`);
	});

	return role;
}

async function roleBackup(guild) {
	// Role#members is cache-backed. Fetching first keeps protected-role member
	// backups complete even after a cold start or a gateway reconnect.
	await guild.members.fetch().catch((error) => {
		console.warn(`[ROLE BACKUP] Sunucu uyeleri yenilenemedi: ${error.message}`);
	});

	await Promise.all(guild.roles.cache.map((role) => backupRole(guild, role, { includeMembers: true })));
}

async function syncRoleMemberBackup(guild, memberId, changes = []) {
	if (!guild?.id || !memberId || !Array.isArray(changes)) return;

	for (const change of changes) {
		const operation = String(change?.key || '').replace('$', '');
		if (!['add', 'remove'].includes(operation)) continue;

		const roleIds = (Array.isArray(change?.new) ? change.new : [])
			.map((role) => role?.id || role)
			.filter(Boolean);

		for (const roleId of roleIds) {
			let document = await roleModel.findOne({ guild: guild.id, role: roleId }).catch(() => null);
			if (!document && operation === 'add') {
				await backupRole(guild, roleId, { includeMembers: true });
				document = await roleModel.findOne({ guild: guild.id, role: roleId }).catch(() => null);
			}
			if (!document) continue;

			const members = new Set(Array.isArray(document.members) ? document.members : []);
			if (operation === 'add') members.add(memberId);
			else members.delete(memberId);

			await roleModel.updateOne(
				{ guild: guild.id, role: roleId },
				{ $set: { members: [...members] } }
			).catch((error) => console.warn(`[ROLE BACKUP] Uye listesi guncellenemedi (${roleId}): ${error.message}`));
		}
	}
}

let perms = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers];

async function punish(client, member, type, reason) {
	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return console.log('Sunucu Bulunamadı!');

	switch (type) {
		case 1:
			member.guild.bans.create(member.id, { reason: 'Wency Security - ' + reason }).catch(() => { });
			break;

		case 2:
			member.kick('Wency Security - ' + reason).catch(() => { });
			break;

		case 3:
			if (!member) return;
			member.roles.remove(member.roles.cache.filter((x) => x.editable && x.name !== '@everyone' && perms.some((perm) => x.permissions.has(perm))).map((x) => x.id)).catch(() => { });
			break;
	};

	const dangerRoles = guild.roles.cache.filter((r) => perms.some((perm) => r.permissions.has(perm)) && r.editable);
	const data = [];
	
	/*for (const r of dangerRoles.values()) {
		data.push({
			role: r.id,
			permissions: new PermissionsBitField(r.permissions.bitfield),
		})

		await r.setPermissions(PermissionsBitField.Flags.SendMessages).catch(() => { });
		await Settings.updateOne(
			{ guildID: guild.id },
			{ $push: { rolePermissions: data } },
			{ $upsert: true }
		);
	}*/
}

async function checkWhitelist(client, member, type) {

	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return false;
	if (!member?.id || !member?.guild || !member?.roles?.cache) return false;

	const document = await Settings.findOne({ guildID: guild.id }).catch((err) => { });

	const whitelists = (document?.whitelist || []).filter(w =>
		w.key === member.id || member.roles.cache.some(r => r.id === w.key)
	);

	const guildOwner = member.id === member.guild.ownerId;
	const developers = config.ownerID.includes(member.id);
	const bots = config.Security.BotsIDs.includes(member.id);

	if (whitelists?.length === 0 && !guildOwner && !developers && !bots) return false;

	const relevantAccess = whitelists?.flatMap(w => w.access).filter(a => a.type === type || a.type === 'full') || [];

	if (relevantAccess.length === 0 && !guildOwner && !developers && !bots) return false;

	const fullAccess = relevantAccess.some(a => a.type === 'full');
	const lowestLimit = Math.min(...relevantAccess.map(a => Number(a.limit) || 0));
	const lowestPunish = Math.min(...relevantAccess.map(a => a.punish));

	const operationPunish = whitelists?.find(w => w.access.some((a) => a.type === type))?.access.find((a) => a.type === type)?.punish;
	const fullPunish = whitelists?.find(w => w.access.some((a) => a.type === 'full'))?.access.find((a) => a.type === 'full')?.punish;
	const punishType = operationPunish || fullPunish || 3;

	const whitelistType = guildOwner ? '👑 Taç Sahibi ' : fullAccess ? '🟢 Full Erişim' : developers ? `👑 Developer` : bots ? `🤖 Wency Bots` : `🟢 Güvenli Listede`
	const limit = guildOwner ? 0 : developers ? 0 : bots ? 0 : lowestLimit;
	const limitType = limit === 0 ? 'Sınırsız' : 'Limitli';
	const dontPunish = limit === 0;

	const now = Date.now();
	const content = `${date(now)} -> ${type}`;
	const key = `${member.id}_${type}`;
	const userLimits = limits.get(key) || { operations: [], lastDate: now };

	userLimits.operations.push(content);
	const diff = now - userLimits.lastDate;

	const timeLimit = 86400000;
	const countLimit = limit === 0 ? Number.MAX_SAFE_INTEGER : limit || 3;

	const currentUserLimit = userLimits.operations.length;
	const maxUserLimit = countLimit;
	const limitRatio = limitType === 'Sınırsız'
		? 'Sınırsız'
		: currentUserLimit > maxUserLimit
			? 'Limit Aşıldı'
			: `${currentUserLimit}/${maxUserLimit}`;

	if (diff < timeLimit && userLimits.operations.length > countLimit && !guildOwner && !developers && !bots) {
		return {
			isWarn: false,
			maxCount: countLimit,
			currentCount: userLimits.operations.length,
			operations: userLimits.operations,
			punish: lowestPunish,
			whitelistType,
			limitType,
			dontPunish,
			limitRatio,
			punishType,
		};
	}

	if (diff > timeLimit) {
		limits.set(key, { operations: [content], lastDate: now });
	} else {
		limits.set(key, userLimits);
	}

	return {
		isWarn: true,
		maxCount: countLimit,
		currentCount: userLimits.operations.length,
		operations: userLimits.operations,
		whitelistType,
		limitType,
		dontPunish,
		limitRatio,
		punishType,
	};
}

async function checkRoles(guild, data) {
	const returnData = { add: [], remove: [] };

	data.forEach(function (rolesData) {
		const type = rolesData.key;
		const filteredData = rolesData.data.filter(function (roleD) {
			const role = guild.roles.cache.get(roleD.id);
			return perms.some(perm => role.permissions.has(perm));
		});

		returnData[type] = filteredData;
	});

	return returnData;
};

async function createRole(client, document, useDistributors = false) {

	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return;

	const oldRoleId = document.role;
	const role = await guild.roles.create({
		name: document.name,
		color: document.color,
		permissions: document.permissions,
		hoist: document.hoist,
		mentionable: document.mentionable,
		reason: `Silinen ${document.name} rolunun otomatik yedegi`,
	}).catch((error) => {
		console.error(`[ROLE RESTORE] ${document.name} rolu olusturulamadi: ${error.message}`);
		return null;
	});

	if (!role) return;
	if (Number.isInteger(document.position)) {
		await role.setPosition(document.position).catch((error) => {
			console.warn(`[ROLE RESTORE] ${role.name} pozisyonu ayarlanamadi: ${error.message}`);
		});
	}
	if (guild.premiumTier >= 2 && document.icon) {
		await role.setIcon(document.icon, `Silinen ${document.name} rolunun simge yedegi`).catch((error) => {
			console.warn(`[ROLE RESTORE] ${role.name} rol simgesi ayarlanamadi: ${error.message}`);
		});
	} else if (document.unicodeEmoji) {
		await role.setUnicodeEmoji(document.unicodeEmoji, `Silinen ${document.name} rolunun emoji yedegi`).catch((error) => {
			console.warn(`[ROLE RESTORE] ${role.name} rol emojisi ayarlanamadi: ${error.message}`);
		});
	}

	await roleModel.updateOne(
		{ guild: guild.id, role: oldRoleId },
		{
			$set: {
				role: role.id,
				isDeleted: false,
				deletedTimestamp: undefined,
				members: [...new Set(Array.isArray(document.members) ? document.members : [])],
				pendingMembers: [...new Set(Array.isArray(document.members) ? document.members : [])]
			}
		},
		{ $upsert: true }
	).catch((error) => console.error(`[ROLE RESTORE] Rol yedegi guncellenemedi: ${error.message}`));

	const guardSettings = await Settings.findOne({ guildID: guild.id }).catch(() => null);
	const protectedRoleIds = (guardSettings?.blackListedRoles || [])
		.flat(Infinity)
		.map((item) => item?.id || item)
		.filter(Boolean);
	if (protectedRoleIds.includes(oldRoleId)) {
		const blackListedRoles = [...new Set(protectedRoleIds.map((id) => id === oldRoleId ? role.id : id))]
			.map((id) => ({ id }));
		await Settings.updateOne(
			{ guildID: guild.id },
			{ $set: { blackListedRoles } },
			{ $upsert: true }
		).catch((error) => console.error(`[ROLE RESTORE] Korunan rol ID'si guncellenemedi: ${error.message}`));
	}

	const channelWrites = Array.isArray(document.channelOverwrites) ? document.channelOverwrites : [];
	for (const overwrite of channelWrites) {
		const channel = guild.channels.cache.get(overwrite.id);
		if (!channel) continue;

		const permissions = {};
		for (const permission of overwrite.allow || []) permissions[permission] = true;
		for (const permission of overwrite.deny || []) permissions[permission] = false;
		await channel.permissionOverwrites.create(role, permissions).catch((error) => {
			console.warn(`[ROLE RESTORE] ${channel.name} kanal izni kurulamadı: ${error.message}`);
		});
	}

	const roleMembers = Array.isArray(document.members) ? [...new Set(document.members)] : [];
	const distribution = roleMembers.length
		? await distributeRoleMembers(client, role, roleMembers, document.name, useDistributors)
		: { restored: 0, pending: 0, workers: 0 };

	if (distribution.pending > 0) {
		console.warn(`[ROLE RESTORE] ${document.name} rolu ${role.id} ID ile kuruldu. ${distribution.restored}/${roleMembers.length} uye tamamlandi, ${distribution.pending} uye kuyrukta.`);
	} else {
		console.log(`[ROLE RESTORE] ${document.name} rolu ${role.id} ID ile kuruldu ve ${roleMembers.length}/${roleMembers.length} uye eksiksiz dagitildi.`);
	}

	return role;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isUnknownGuildMember(error) {
	return [10007, 10013].includes(Number(error?.code)) || Number(error?.status) === 404;
}

async function getRoleRestoreWorkers(client, role, useDistributors) {
	const distributors = useDistributors ? await startDists(config.Security.Dists).catch(() => []) : [];
	// Data botlari varsa dagitimi sadece onlar yapar. Hicbiri kullanilabilir
	// degilse Backup botu guvenli geri-donus olarak devreye girer.
	const pool = distributors.length ? distributors : [client];
	const candidates = pool.filter((worker, index, array) => (
		worker?.isReady?.() && array.findIndex((item) => item?.user?.id === worker.user.id) === index
	));
	const workers = [];

	for (const worker of candidates) {
		const workerGuild = worker.guilds.cache.get(role.guild.id)
			|| await worker.guilds.fetch(role.guild.id).catch(() => null);
		if (!workerGuild) continue;

		const botMember = workerGuild.members.me || await workerGuild.members.fetchMe().catch(() => null);
		const workerRole = workerGuild.roles.cache.get(role.id)
			|| await workerGuild.roles.fetch(role.id).catch(() => null);
		if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) continue;
		if (!workerRole || botMember.roles.highest.comparePositionTo(workerRole) <= 0) continue;
		workers.push({ client: worker, guild: workerGuild });
	}

	if (!workers.length && pool[0] !== client && client?.isReady?.()) {
		const workerGuild = client.guilds.cache.get(role.guild.id);
		if (!workerGuild) return workers;
		const botMember = workerGuild.members.me || await workerGuild.members.fetchMe().catch(() => null);
		if (workerGuild && botMember?.permissions.has(PermissionFlagsBits.ManageRoles)
			&& botMember.roles.highest.comparePositionTo(role) > 0) {
			workers.push({ client, guild: workerGuild });
		}
	}

	return workers;
}

async function giveRestoredRole(worker, role, memberId, roleName) {
	let lastError;
	for (let attempt = 1; attempt <= 6; attempt++) {
		try {
			const member = await worker.guild.members.fetch({ user: memberId, force: attempt > 1 });
			if (!member) return { completed: true, skipped: true };
			if (member.roles.cache.has(role.id)) return { completed: true };
			await member.roles.add(role.id, `Silinen ${roleName} rolunun uye yedegi`);
			return { completed: true };
		} catch (error) {
			lastError = error;
			if (isUnknownGuildMember(error)) return { completed: true, skipped: true };
			await wait(Math.min(12000, 750 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 250));
		}
	}

	console.warn(`[ROLE RESTORE RETRY] ${memberId}: ${lastError?.message || 'Bilinmeyen hata'}`);
	return { completed: false };
}

async function distributeRoleMembers(client, role, memberIds, roleName = role.name, useDistributors = true) {
	const restoreKey = `${role.guild.id}:${role.id}`;
	if (activeRoleRestores.has(restoreKey)) {
		const backup = await roleModel.findOne({ guild: role.guild.id, role: role.id }).catch(() => null);
		return {
			restored: 0,
			pending: Array.isArray(backup?.pendingMembers) ? backup.pendingMembers.length : 0,
			workers: 0,
			alreadyRunning: true
		};
	}

	activeRoleRestores.add(restoreKey);
	try {
		return await runRoleMemberDistribution(client, role, memberIds, roleName, useDistributors);
	} finally {
		activeRoleRestores.delete(restoreKey);
	}
}

async function runRoleMemberDistribution(client, role, memberIds, roleName, useDistributors) {
	const targets = [...new Set((memberIds || []).filter(Boolean))];
	if (!targets.length) {
		await roleModel.updateOne(
			{ guild: role.guild.id, role: role.id },
			{ $set: { pendingMembers: [] } }
		).catch(() => null);
		return { restored: 0, pending: 0, workers: 0 };
	}

	const workers = await getRoleRestoreWorkers(client, role, useDistributors);
	if (!workers.length) {
		await roleModel.updateOne(
			{ guild: role.guild.id, role: role.id },
			{ $set: { pendingMembers: targets } }
		).catch(() => null);
		console.error(`[ROLE RESTORE] ${role.name} rolunu dagitabilecek bot bulunamadi. ${targets.length} uye kuyrukta tutuluyor.`);
		return { restored: 0, pending: targets.length, workers: 0 };
	}

	const pending = new Set(targets);
	const queues = workers.map(() => []);
	targets.forEach((memberId, index) => queues[index % workers.length].push(memberId));
	let completedSinceSave = 0;
	let persistChain = Promise.resolve();

	const persist = (force = false) => {
		if (!force && completedSinceSave < 10) return persistChain;
		completedSinceSave = 0;
		const snapshot = [...pending];
		persistChain = persistChain.then(() => roleModel.updateOne(
			{ guild: role.guild.id, role: role.id },
			{ $set: { pendingMembers: snapshot } },
			{ $upsert: true }
		).catch((error) => console.warn(`[ROLE RESTORE QUEUE] Kuyruk kaydedilemedi: ${error.message}`)));
		return persistChain;
	};

	const currentBackup = await roleModel.findOne({ guild: role.guild.id, role: role.id }).catch(() => null);
	const desiredMembers = [...new Set([...(currentBackup?.members || []), ...targets])];
	await roleModel.updateOne(
		{ guild: role.guild.id, role: role.id },
		{ $set: { members: desiredMembers, pendingMembers: targets } },
		{ $upsert: true }
	).catch(() => null);

	console.log(`[ROLE RESTORE] ${role.name}: ${targets.length} uye ${workers.length} dagitici bot arasinda kuyruga alindi.`);
	await Promise.all(workers.map(async (worker, workerIndex) => {
		for (const memberId of queues[workerIndex]) {
			const result = await giveRestoredRole(worker, role, memberId, roleName);
			if (result.completed) {
				pending.delete(memberId);
				completedSinceSave++;
				persist(false);
			}
			// Her data botu kontrollu ilerler; Discord rate limit kuyrugu tasmaz.
			await wait(175);
		}
	}));

	await persist(true);
	await persistChain;
	const restored = targets.length - pending.size;
	if (pending.size) {
		console.error(`[ROLE RESTORE] ${role.name}: ${restored}/${targets.length} tamamlandi, ${pending.size} uye sonraki deneme icin kuyrukta.`);
	} else {
		console.log(`[ROLE RESTORE] ${role.name}: ${targets.length}/${targets.length} uye eksiksiz tamamlandi.`);
	}

	return { restored, pending: pending.size, workers: workers.length };
}

async function createChannel(client, document) {
	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return;

	const createOptions = {
		name: document.name,
		type: document.type,
	};

	if (document.parentId) createOptions.parent = document.parentId

	if (document.type === ChannelType.GuildText || document.type === ChannelType.GuildAnnouncement) {
		createOptions.topic = document.topic;
		createOptions.nsfw = document.nsfw;
		createOptions.rateLimitPerUser = document.rateLimitPerUser;
	} else if (document.type === ChannelType.GuildVoice) {
		let bitrate = document.bitrate;
		const bitrates = Object.values(voiceBitrates);
		while (bitrate > voiceBitrates[guild.premiumTier]) {
			bitrate = bitrates[guild.premiumTier];
		}
		createOptions.bitrate = bitrate;
		createOptions.userLimit = document.userLimit;
	};

	const channel = await guild.channels.create(createOptions);

	await channelModel.updateOne(
		{ guild: config.serverID, channel: document.channel },
		{ $set: { channel: channel.id, isDeleted: false, deletedTimestamp: undefined } },
		{ $upsert: true }
	).catch((err) => console.log(err));

	if (document.permissionOverwrites) channel.permissionOverwrites.set(document.permissionOverwrites);
	if (document.position) channel.setPosition(document.position);

	if (Array.isArray(document.messages) && document.messages.length) {
		const webhook = await channel.createWebhook({
			name: channel.client.user.displayName,
			avatar: channel.client.user.displayAvatarURL(),
		});

		for (const msg of document.messages) {
			const sentMsg = await webhook.send({
				content: msg.content.length ? msg?.content : undefined,
				username: msg.username,
				avatarURL: msg.avatarURL,
				embeds: msg.embeds,
				files: msg.files.map((f) => new AttachmentBuilder(f.attachment, { name: f.name })),
			});

			if (msg.pinned && sentMsg) await sentMsg.pin();
		};

		await webhook.delete();
	};

	if (document.type === ChannelType.GuildCategory) {
		await channelModel.updateOne(
			{ guild: config.serverID, parentId: document.channel },
			{ $set: { parentId: channel.id } },
			{ $upsert: true }
		).catch((err) => { });
	}

	return channel;
}

async function createExpression(client, id, type) {
	const data = await expressionModel.findOne({ expression: id }).catch((err) => { });
	if (!data) return;

	const guild = client.guilds.cache.get(config.serverID);
	if (!guild) return;

	if (type === 'emoji') {
		if (data.animated) {
			await guild.emojis.create({ name: data.name, attachment: data.url });
		} else {
			await guild.emojis.create({ name: data.name, attachment: data.url });
		}
	} else if (type === 'sticker') {
		await guild.stickers.create({
			name: data.name,
			description: data.description,
			tags: data.tags,
			file: { attachment: `https://cdn.discordapp.com/stickers/${data.id}.png` }
		}).catch(err => { });
	}
}

module.exports = { date, startDists, checkWhitelist, punish, backupRole, roleBackup, syncRoleMemberBackup, expressionBackup, channelBackup, checkRoles, createRole, distributeRoleMembers, createChannel, createExpression };
