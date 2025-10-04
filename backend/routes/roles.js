const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Server = require('../models/Server');
const { requirePermission, requireOwner, PERMISSIONS } = require('../middleware/permissions');
const { auth } = require('../middleware/auth');

// Get all roles for a server
router.get('/server/:serverId', [auth], async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const roles = await Role.find({ server: serverId })
      .sort({ position: -1 }); // Highest position first
    
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create a new role  
router.post('/server/:serverId', [auth, requirePermission(PERMISSIONS.MANAGE_ROLES)], async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, color, permissions, hoist, mentionable } = req.body;

    // Validate server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Get highest position for new role
    const highestRole = await Role.findOne({ server: serverId }).sort({ position: -1 });
    const newPosition = highestRole ? highestRole.position + 1 : 1;

    const role = new Role({
      name: name || 'New Role',
      color: color || '#99AAB5',
      permissions: permissions || {},
      position: newPosition,
      hoist: hoist || false,
      mentionable: mentionable || false,
      server: serverId
    });

    await role.save();

    // Add role to server
    server.roles.push(role._id);
    await server.save();

    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update a role
router.put('/:roleId', [auth], async (req, res) => {
  try {
    const { roleId } = req.params;
    const updates = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user is server owner or has MANAGE_ROLES permission
    const server = await Server.findById(role.server);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const isOwner = server.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const hasAccess = await require('../middleware/permissions').hasPermission(
        req.user._id, 
        role.server, 
        PERMISSIONS.MANAGE_ROLES
      );
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Don't allow updating @everyone role name or position
    if (role.isDefault && (updates.name || updates.position !== undefined)) {
      return res.status(400).json({ error: 'Cannot modify @everyone role name or position' });
    }

    // Update role
    Object.assign(role, updates);
    await role.save();

    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete a role
router.delete('/:roleId', [auth], async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user is server owner or has MANAGE_ROLES permission
    const server = await Server.findById(role.server);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const isOwner = server.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      // Check if user has MANAGE_ROLES permission
      const hasAccess = await require('../middleware/permissions').hasPermission(
        req.user._id, 
        role.server, 
        PERMISSIONS.MANAGE_ROLES
      );
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Don't allow deleting @everyone role
    if (role.isDefault) {
      return res.status(400).json({ error: 'Cannot delete @everyone role' });
    }

    // Remove from server roles array
    server.roles = server.roles.filter(r => r.toString() !== roleId);
    
    // Remove from all members
    server.members.forEach(member => {
      member.roles = member.roles.filter(r => r.toString() !== roleId);
    });
    
    await server.save();
    await Role.findByIdAndDelete(roleId);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Assign role to member
router.post('/:roleId/assign/:userId', [auth], async (req, res) => {
  try {
    const { roleId, userId } = req.params;
    const { serverId } = req.body;

    console.log('🎭 Assign role request:', { roleId, userId, serverId });

    const server = await Server.findById(serverId);
    if (!server) {
      console.log('❌ Server not found:', serverId);
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user is server owner or has MANAGE_ROLES permission
    const isOwner = server.owner.toString() === req.user._id.toString();
    console.log('👑 Is owner:', isOwner);
    
    if (!isOwner) {
      const hasAccess = await require('../middleware/permissions').hasPermission(
        req.user._id, 
        serverId, 
        PERMISSIONS.MANAGE_ROLES
      );
      
      console.log('🔐 Has MANAGE_ROLES permission:', hasAccess);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const role = await Role.findById(roleId);
    if (!role) {
      console.log('❌ Role not found:', roleId);
      return res.status(404).json({ error: 'Role not found' });
    }

    console.log('✅ Role found:', role.name);

    // Find member in server
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member) {
      console.log('❌ Member not found. UserId:', userId);
      console.log('📋 Server members:', server.members.map(m => ({ user: m.user.toString(), username: m.username })));
      return res.status(404).json({ error: 'User is not a member of this server' });
    }

    console.log('✅ Member found');

    // Check if user already has this role
    if (member.roles.includes(roleId)) {
      console.log('⚠️ User already has this role');
      return res.status(400).json({ error: 'User already has this role' });
    }

    // Add role to member
    member.roles.push(roleId);
    await server.save();

    // Emit socket event to notify all server members about role assignment
    const io = req.app.get('io');
    if (io) {
      const roleAssignmentData = {
        userId: userId,
        serverId: serverId,
        roleId: roleId,
        roleName: role.name,
        roleColor: role.color,
        action: 'assigned'
      };
      
      io.to(`server:${serverId}`).emit('roleAssignment', roleAssignmentData);
      console.log(`🎭 Role ${role.name} assigned to user ${userId} - broadcasted to server:${serverId}`);
    }

    res.json({ message: 'Role assigned successfully' });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove role from member
router.delete('/:roleId/remove/:userId', [auth], async (req, res) => {
  try {
    const { roleId, userId } = req.params;
    const { serverId } = req.body;

    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user is server owner or has MANAGE_ROLES permission
    const isOwner = server.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const hasAccess = await require('../middleware/permissions').hasPermission(
        req.user._id, 
        serverId, 
        PERMISSIONS.MANAGE_ROLES
      );
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Find member in server
    const member = server.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ error: 'User is not a member of this server' });
    }

    // Remove role from member
    member.roles = member.roles.filter(r => r.toString() !== roleId);
    await server.save();

    // Find role details for the broadcast
    const role = await Role.findById(roleId);
    const io = req.app.get('io');
    if (role && io) {
      // Broadcast role removal to all server members
      io.to(`server:${serverId}`).emit('roleAssignment', {
        userId,
        serverId,
        roleId,
        roleName: role.name,
        roleColor: role.color,
        action: 'removed'
      });
      console.log(`🎭 Role ${role.name} removed from user ${userId} - broadcasted to server:${serverId}`);
    }

    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// Reorder roles
router.put('/server/:serverId/reorder', [auth, requirePermission(PERMISSIONS.MANAGE_ROLES)], async (req, res) => {
  try {
    const { serverId } = req.params;
    const { roleOrder } = req.body; // Array of role IDs in new order

    if (!Array.isArray(roleOrder)) {
      return res.status(400).json({ error: 'Role order must be an array' });
    }

    // Update positions
    for (let i = 0; i < roleOrder.length; i++) {
      await Role.findByIdAndUpdate(roleOrder[i], { position: roleOrder.length - i });
    }

    const updatedRoles = await Role.find({ server: serverId }).sort({ position: -1 });
    res.json(updatedRoles);
  } catch (error) {
    console.error('Reorder roles error:', error);
    res.status(500).json({ error: 'Failed to reorder roles' });
  }
});

module.exports = router;
