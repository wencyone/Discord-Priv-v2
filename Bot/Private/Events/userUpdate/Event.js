const { Events } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const { isBannedGuildTagSystemEnabled, syncBannedGuildTag } = require('../../../Base/BannedGuildTag');
const { syncGuildTagRole } = require('../../../Base/GuildTagRole');

client.on(Events.UserUpdate, async (oldUser, newUser) => {
    const guild = client.guilds.cache.get(global.system.serverID);
    if (!guild) return;

    const settings = await Settings.findOne({ id: guild.id }).catch(() => null);
    if (!settings) return;

    const member = await guild.members.fetch(newUser.id).catch(() => null);
    if (!member) return;

    if (isBannedGuildTagSystemEnabled(settings) && settings.bannedGuildTags?.length) {
        const tagStatus = await syncBannedGuildTag(client, member, settings, newUser)
            .catch((error) => {
                console.error('[BANNED_GUILD_TAG_UPDATE]', error);
                return 'blocked';
            });
        if (tagStatus === 'jailed' || tagStatus === 'blocked') return;
    }

    await syncGuildTagRole(member, settings, newUser, oldUser)
        .catch((error) => console.error('[GUILD_TAG_ROLE_UPDATE]', error));
});
