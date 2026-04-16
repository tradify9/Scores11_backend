import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from './modules/match/match.model.js';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  console.log('✅ Connected');
  const total = await Match.countDocuments();
  console.log('Total matches:', total);
  
  const active = await Match.countDocuments({ isActive: { $ne: false } });
  console.log('Active matches:', active);
  
  const sample = await Match.findOne().lean();
  console.log('Sample:', JSON.stringify(sample, null, 2));
  
  mongoose.disconnect();
}).catch(console.error);

