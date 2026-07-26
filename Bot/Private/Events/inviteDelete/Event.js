const { Events } = require('discord.js');
const { updateInviteCache } = require('../../../Base/InviteLog');

client.on(Events.InviteDelete, async (invite) => {
    if (!invite.guild) return;
    await updateInviteCache(invite.guild).catch((error) => console.error('[INVITE_DELETE_CACHE]', error));
});
