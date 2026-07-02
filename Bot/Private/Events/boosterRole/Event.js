const { Events } = require('discord.js');
const {
    handleBoosterRoleInteraction,
    restoreBoosterRole,
    suspendBoosterRole,
} = require('../../../Base/BoosterRole');

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.customId?.startsWith('booster-role:')) return;
    await handleBoosterRoleInteraction(client, interaction)
        .catch((error) => console.error('[BOOSTER_ROLE_INTERACTION]', error));
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const wasBooster = Boolean(oldMember.premiumSinceTimestamp || oldMember.premiumSince);
    const isBooster = Boolean(newMember.premiumSinceTimestamp || newMember.premiumSince);
    if (wasBooster === isBooster) return;

    if (isBooster) {
        await restoreBoosterRole(newMember.guild, newMember.id).catch((error) => console.error('[BOOSTER_ROLE_RESTORE]', error));
    } else {
        await suspendBoosterRole(newMember.guild, newMember.id).catch((error) => console.error('[BOOSTER_ROLE_SUSPEND]', error));
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    await suspendBoosterRole(member.guild, member.id).catch((error) => console.error('[BOOSTER_ROLE_LEAVE]', error));
});
