const { Events } = require('discord.js');
const { updateInviteCache } = require('../../../Base/InviteLog');

client.on(Events.InviteCreate, async (invite) => {
    if (!invite.guild) return;
    await updateInviteCache(invite.guild).catch((error) => console.error('[INVITE_CREATE_CACHE]', error));
});
