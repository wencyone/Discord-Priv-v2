function getOwnerRoles(settings) {
    if (Array.isArray(settings?.ownerRole)) return settings.ownerRole.filter(Boolean);
    return settings?.ownerRole ? [settings.ownerRole] : [];
}

function hasOwnerRole(member, settings) {
    const ownerRoles = getOwnerRoles(settings);
    return Boolean(
        global.system?.ownerID?.includes(member?.id)
        || ownerRoles.some((roleId) => member?.roles?.cache?.has(roleId))
    );
}

module.exports = { getOwnerRoles, hasOwnerRole };
