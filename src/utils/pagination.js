export const pagination = (model, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(model.length / limit),
      totalResults: model.length
    }
  };
};

export const paginatedResults = (model, page, limit) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: model.length,
      totalPages: Math.ceil(model.length / limit),
      hasNext: endIndex < model.length,
      hasPrev: startIndex > 0
    }
  };

  return results;
};

export const getPagination = (query) => {
  // Handle both cases: when query is passed as object or as separate params
  const queryObj = typeof query === 'object' ? query : {};
  
  const page = parseInt(queryObj.page, 10) || 1;
  const limit = parseInt(queryObj.limit, 10) || 10;
  
  // Get sortBy and sortOrder from query, with defaults
  const sortBy = queryObj.sortBy || 'createdAt';
  const sortOrder = queryObj.sortOrder || -1;
  
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder
  };
};

export default pagination;
