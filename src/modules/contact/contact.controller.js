import { contactService } from './contact.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const contactController = {
  // Submit ticket
  createTicket: catchAsync(async (req, res) => {
    const ticket = await contactService.createTicket(req.body, req.user?.userId);
    res.status(201).json(new ApiResponse(201, 'Ticket created successfully', ticket));
  }),

  // Get my tickets
  getMyTickets: catchAsync(async (req, res) => {
    const { tickets, pagination } = await contactService.getMyTickets(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Tickets retrieved', tickets, pagination));
  }),

  // Get ticket by ID
  getTicketById: catchAsync(async (req, res) => {
    const ticket = await contactService.getTicketById(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Ticket retrieved', ticket));
  }),

  // Get all tickets (Admin)
  getAllTickets: catchAsync(async (req, res) => {
    const { tickets, pagination } = await contactService.getAllTickets(req.query);
    res.json(new ApiResponse(200, 'Tickets retrieved', tickets, pagination));
  }),

  // Update ticket status (Admin)
  updateTicketStatus: catchAsync(async (req, res) => {
    const { status, assignedTo } = req.body;
    const ticket = await contactService.updateTicketStatus(req.params.id, status, assignedTo);
    res.json(new ApiResponse(200, 'Ticket status updated', ticket));
  }),

  // Reply to ticket
  replyToTicket: catchAsync(async (req, res) => {
    const { message } = req.body;
    const ticket = await contactService.replyToTicket(req.params.id, req.user.userId, message);
    res.json(new ApiResponse(200, 'Reply added successfully', ticket));
  }),

  // Close ticket
  closeTicket: catchAsync(async (req, res) => {
    const ticket = await contactService.closeTicket(req.params.id, req.user.userId);
    res.json(new ApiResponse(200, 'Ticket closed successfully', ticket));
  })
};

export default contactController;
