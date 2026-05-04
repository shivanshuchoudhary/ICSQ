import mongoose from 'mongoose';
import { config } from 'dotenv';
import { DepartmentMapping } from '../models/DepartmentMapping.model.js';

config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('departmentmappings');

    // Drop all existing indexes
    await collection.dropIndexes();
    console.log('Dropped existing indexes');

    // Create the correct index
    await collection.createIndex({ department: 1 }, { unique: true });
    console.log('Created new index on department field');

    // Verify indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    console.log('Index fix completed successfully');
  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixIndexes(); 