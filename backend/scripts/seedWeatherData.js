require('dotenv').config();
const mongoose = require('mongoose');
const WeatherData = require('../src/models/WeatherData');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/floodguard';

const seedData = [
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 28.5,
    humidity: 75.0,
    windSpeed: 10.5,
    rainfall: 5.2,
    waterLevel: 1.2,
    recordedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 27.0,
    humidity: 82.0,
    windSpeed: 12.0,
    rainfall: 15.8,
    waterLevel: 1.8,
    recordedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 26.5,
    humidity: 88.0,
    windSpeed: 15.5,
    rainfall: 45.0,
    waterLevel: 2.5,
    recordedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 26.0,
    humidity: 92.0,
    windSpeed: 18.0,
    rainfall: 78.5,
    waterLevel: 3.4,
    recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 25.5,
    humidity: 95.0,
    windSpeed: 20.5,
    rainfall: 120.2,
    waterLevel: 4.8,
    recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 26.0,
    humidity: 90.0,
    windSpeed: 14.5,
    rainfall: 30.5,
    waterLevel: 4.2,
    recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    source: 'manual_entry'
  },
  {
    location: "Dunamale",
    district: "Gampaha",
    temperature: 27.5,
    humidity: 80.0,
    windSpeed: 11.2,
    rainfall: 10.0,
    waterLevel: 3.8,
    recordedAt: new Date(),
    source: 'manual_entry'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');
    
    // Clear existing weather data for this location to avoid duplicates in sequence
    await WeatherData.deleteMany({ location: "Dunamale" });
    console.log('Cleared existing weather data for Dunamale.');

    await WeatherData.insertMany(seedData);
    console.log(`Successfully seeded ${seedData.length} weather records for Dunamale.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding weather data:', error);
    process.exit(1);
  }
};

seedDB();
