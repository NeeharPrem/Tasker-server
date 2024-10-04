export const roleCheck = (userRole: string, allowedRoles: string[]) => {
    return allowedRoles.includes(userRole);
};