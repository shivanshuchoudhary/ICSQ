import mongoose from 'mongoose';
import { DepartmentMapping } from '../DepartmentMapping.model.js';

const MONGODB_URI = "mongodb://localhost:27017/ICSQ";

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('departmentmappings');
    
    // List current indexes
    console.log('\nCurrent indexes:');
    const currentIndexes = await collection.indexes();
    console.log(JSON.stringify(currentIndexes, null, 2));

    // Drop all indexes except _id
    await collection.dropIndexes();
    console.log('\nDropped all indexes except _id');

    // Create the correct index
    await collection.createIndex({ department: 1 }, { 
      unique: true,
      name: 'department_unique',
      background: true,
      sparse: true
    });
    console.log('\nCreated new index on department field');

    // Verify the fix
    const documents = await collection.find({}).toArray();
    console.log('\nCurrent documents in collection:');
    console.log(JSON.stringify(documents, null, 2));

    // Verify new indexes
    console.log('\nNew indexes:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    console.log('\nIndex fix completed successfully');
  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixIndexes(); 