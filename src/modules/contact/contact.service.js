import Contact from './contact.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const contactService = {
  // Submit ticket
  createTicket: async (ticketData, userId) => {
    const ticket = await Contact.create({
      ...ticketData,
      user: userId
    });
    return ticket;
  },

  // Get my tickets
  getMyTickets: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [tickets, total] = await Promise.all([
      Contact.find({ user: userId, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contact.countDocuments({ user: userId, isActive: true })
    ]);

    return { tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  // Get ticket by ID
  getTicketById: async (ticketId, userId) => {
    const ticket = await Contact.findOne({ _id: ticketId, user: userId, isActive: true });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    return ticket;
  },

  // Get all tickets (Admin)
  getAllTickets: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    const [tickets, total] = await Promise.all([
      Contact.find(filter)
        .populate('user', 'name email')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contact.countDocuments(filter)
    ]);

    return { tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  // Update ticket status (Admin)
  updateTicketStatus: async (ticketId, status, assignedTo) => {
    const updateData = { status };
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    const ticket = await Contact.findByIdAndUpdate(ticketId, updateData, { new: true })
      .populate('user', 'name email');
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    return ticket;
  },

  // Reply to ticket
  replyToTicket: async (ticketId, userId, message) => {
    const ticket = await Contact.findById(ticketId);
    if (!ticket) throw new ApiError(404, 'Ticket not found');

    ticket.replies.push({ user: userId, message, createdAt: new Date() });
    ticket.status = 'in_progress';
    await ticket.save();

    return ticket;
  },

  // Close ticket
  closeTicket: async (ticketId, userId) => {
    const ticket = await Contact.findOne({ _id: ticketId, user: userId });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    
    ticket.status = 'closed';
    await ticket.save();
    return ticket;
  }
};

export default contactService;
