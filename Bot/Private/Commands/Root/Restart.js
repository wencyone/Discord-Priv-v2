const { hasOwnerRole } = require('../../../Base/OwnerRole');
module.exports = {
    name: 'restart',
    aliases: ['r'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (!hasOwnerRole(message.member, wency)) return;

        await message.delete()
        process.exit(0);
    }
}