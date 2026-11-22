// Koneksi ke MySQL Laragon (default: user root, password kosong)
// const mysql = require('mysql2/promise');

// module.exports = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'agensi_digital',
//   waitForConnections: true,
//   connectionLimit: 10,
// });

// Koneksi ke MongoDb (default: user root, password kosong)
const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log('Terhubung ke MongoDB');
}

module.exports = connectDB;
