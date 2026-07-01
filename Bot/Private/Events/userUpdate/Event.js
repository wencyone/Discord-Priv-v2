const { Events } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const { syncBannedGuildTag } = require('../../../Base/BannedGuildTag');

client.on(Events.UserUpdate, async (oldUser, newUser) => {
    const guild = client.guilds.cache.get(global.system.serverID);
    if (!guild) return;

    const settings = await Settings.findOne({ id: guild.id }).catch(() => null);
    if (!settings?.autoRole || !settings.bannedGuildTags?.length) return;

    const member = await guild.members.fetch(newUser.id).catch(() => null);
    if (!member) return;

    await syncBannedGuildTag(client, member, settings, newUser)
        .catch((error) => console.error('[BANNED_GUILD_TAG_UPDATE]', error));
});
