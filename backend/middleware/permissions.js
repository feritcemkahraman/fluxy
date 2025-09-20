const Role = require('../models/Role');
const Server = require('../models/Server');

// Permission constants
const PERMISSIONS = {
  ADMINISTRATOR: 'administrator',
  MANAGE_SERVER: 'manageServer',
  MANAGE_ROLES: 'manageRoles',
  MANAGE_CHANNELS: 'manageChannels',
  KICK_MEMBERS: 'kickMembers',
  BAN_MEMBERS: 'banMembers',
  CREATE_INSTANT_INVITE: 'createInstantInvite',
  CHANGE_NICKNAME: 'changeNickname',
  MANAGE_NICKNAMES: 'manageNicknames',
  SEND_MESSAGES: 'sendMessages',
  SEND_TTS_MESSAGES: 'sendTTSMessages',
  MANAGE_MESSAGES: 'manageMessages',
  EMBED_LINKS: 'embedLinks',
  ATTACH_FILES: 'attachFiles',
  READ_MESSAGE_HISTORY: 'readMessageHistory',
  MENTION_EVERYONE: 'mentionEveryone',
  USE_EXTERNAL_EMOJIS: 'useExternalEmojis',
  ADD_REACTIONS: 'addReactions',
  CONNECT: 'connect',
  SPEAK: 'speak',
  MUTE_MEMBERS: 'muteMembers',
  DEAFEN_MEMBERS: 'deafenMembers',
  MOVE_MEMBERS: 'moveMembers',
  USE_VOICE_ACTIVATION: 'useVoiceActivation',
  PRIORITY_SPEAKER: 'prioritySpeaker'
};

// Check if user has permission in a server
const hasPermission = async (userId, serverId, permission) => {
  try {
    // Get server with member roles
    const server = await Server.findById(serverId)
      .populate({
        path: 'members.roles',
        model: 'Role'
      });

    if (!server) {
      return false;
    }

    // Check if user is server owner
    if (server.owner.toString() === userId.toString()) {
      return true;
    }

    // Find user in server members
    const member = server.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return false;
    }

    // Check permissions in user's roles
    for (const role of member.roles) {
      if (role.permissions.administrator || role.permissions[permission]) {
        return true;
      }
    }

    // Check default @everyone role if user has no specific roles
    if (member.roles.length === 0) {
      const defaultRole = await Role.findOne({ server: serverId, isDefault: true });
      if (defaultRole && (defaultRole.permissions.administrator || defaultRole.permissions[permission])) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

// Get user's highest role in server
const getHighestRole = async (userId, serverId) => {
  try {
    const server = await Server.findById(serverId)
      .populate({
        path: 'members.roles',
        model: 'Role'
      });

    if (!server) {
      return null;
    }

    // Server owner has highest privileges
    if (server.owner.toString() === userId.toString()) {
      return {
        name: 'Owner',
        color: '#F04747',
        permissions: { administrator: true },
        position: 999999
      };
    }

    const member = server.members.find(m => m.user.toString() === userId.toString());
    if (!member || member.roles.length === 0) {
      // Return default @everyone role
      const defaultRole = await Role.findOne({ server: serverId, isDefault: true });
      return defaultRole;
    }

    // Return highest positioned role
    return member.roles.reduce((highest, current) => {
      return current.position > highest.position ? current : highest;
    });
  } catch (error) {
    console.error('Get highest role error:', error);
    return null;
  }
};

// Middleware to check server permissions
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;
      const serverId = req.params.serverId || req.body.serverId;

      if (!serverId) {
        return res.status(400).json({ error: 'Server ID is required' });
      }

      const hasAccess = await hasPermission(userId, serverId, permission);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission 
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to check if user is server owner
const requireOwner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const serverId = req.params.serverId || req.params.id || req.body.serverId;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only server owner can perform this action' });
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user is server member
const requireMember = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const serverId = req.params.serverId || req.params.id || req.body.serverId;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const isMember = server.members.some(member => 
      member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }

    next();
  } catch (error) {
    console.error('Member check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user can manage another user (role hierarchy)
const canManageUser = async (managerId, targetUserId, serverId) => {
  try {
    // Server owner can manage anyone
    const server = await Server.findById(serverId);
    if (server.owner.toString() === managerId.toString()) {
      return true;
    }

    // Can't manage server owner
    if (server.owner.toString() === targetUserId.toString()) {
      return false;
    }

    // Can't manage yourself
    if (managerId.toString() === targetUserId.toString()) {
      return false;
    }

    const managerRole = await getHighestRole(managerId, serverId);
    const targetRole = await getHighestRole(targetUserId, serverId);

    if (!managerRole || !targetRole) {
      return false;
    }

    // Manager must have higher role position
    return managerRole.position > targetRole.position;
  } catch (error) {
    console.error('Can manage user check error:', error);
    return false;
  }
};

module.exports = {
  PERMISSIONS,
  hasPermission,
  getHighestRole,
  requirePermission,
  requireOwner,
  requireMember,
  canManageUser
};
