import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from './config/env.js';
import { Room } from './models/Room.js';
import { User } from './models/User.js';

if (env.NODE_ENV === 'production') {
  throw new Error('Demo seed data must never be written to production.');
}

const listings = [
  { title: 'Sunlit room in a calm Indiranagar home', roomType: 'Single Room', propertyType: 'Apartment', city: 'Bengaluru', locality: 'Indiranagar', rent: 14500, deposit: 30000, furnishing: 'Furnished', ownerName: 'Ananya', amenities: ['Wi-Fi', 'Attached balcony', 'Washing machine'], image: 'photo-1522708323590-d24dbb6b0267' },
  { title: 'Spacious shared home near Hauz Khas', roomType: 'Double Sharing', propertyType: 'Apartment', city: 'Delhi', locality: 'Hauz Khas', rent: 11000, deposit: 22000, furnishing: 'Semi-furnished', ownerName: 'Rahul', amenities: ['Wi-Fi', 'Metro nearby', 'Kitchen'], image: 'photo-1600607687939-ce8a6c25118c' },
  { title: 'A bright 1 BHK close to Gomti Nagar', roomType: '1 BHK', propertyType: 'Apartment', city: 'Lucknow', locality: 'Gomti Nagar', rent: 13500, deposit: 27000, furnishing: 'Furnished', ownerName: 'Meera', amenities: ['Lift', 'Parking', 'Power backup'], image: 'photo-1600210492486-724fe5c67fb0' },
  { title: 'Friendly PG with meals in Civil Lines', roomType: 'PG', propertyType: 'PG', city: 'Prayagraj', locality: 'Civil Lines', rent: 7500, deposit: 10000, furnishing: 'Furnished', ownerName: 'Vivek', amenities: ['Meals included', 'Wi-Fi', 'Housekeeping'], image: 'photo-1600566753086-00f18fb6b3ea' },
  { title: 'Modern room in a shared Noida apartment', roomType: 'Single Room', propertyType: 'Apartment', city: 'Noida', locality: 'Sector 62', rent: 12000, deposit: 24000, furnishing: 'Furnished', ownerName: 'Kavita', amenities: ['Metro nearby', 'Wi-Fi', 'Gym'], image: 'photo-1600607687920-4e2a09cf159d' },
  { title: 'Easy-going shared flat near Cyber Hub', roomType: 'Double Sharing', propertyType: 'Apartment', city: 'Gurgaon', locality: 'DLF Phase 3', rent: 15500, deposit: 30000, furnishing: 'Semi-furnished', ownerName: 'Arjun', amenities: ['Fully equipped kitchen', 'Wi-Fi', 'Security'], image: 'photo-1600607687644-c7171b42498f' },
  { title: 'Peaceful 2 BHK in a Varanasi neighbourhood', roomType: '2 BHK', propertyType: 'Independent House', city: 'Varanasi', locality: 'Lanka', rent: 18000, deposit: 35000, furnishing: 'Unfurnished', ownerName: 'Shalini', amenities: ['Terrace access', 'Water supply', 'Parking'], image: 'photo-1600566753190-17f0baa2a6c3' },
  { title: 'Warm, airy studio in Powai', roomType: '1 BHK', propertyType: 'Apartment', city: 'Mumbai', locality: 'Powai', rent: 26000, deposit: 52000, furnishing: 'Furnished', ownerName: 'Nikhil', amenities: ['Pool', 'Gym', 'Security'], image: 'photo-1600210492493-0946911123ea' },
  { title: 'Comfortable room near the Kanpur metro', roomType: 'Triple Sharing', propertyType: 'Independent House', city: 'Kanpur', locality: 'Swaroop Nagar', rent: 6500, deposit: 12000, furnishing: 'Semi-furnished', ownerName: 'Sonal', amenities: ['Wi-Fi', 'Kitchen access', 'Market nearby'], image: 'photo-1600607687920-4e2a09cf159d' },
];

try {
  await mongoose.connect(env.MONGODB_URI);
  const demoOwner = await User.findOneAndUpdate(
    { email: 'demo-owner@roomonrent.local' },
    { $setOnInsert: {
      name: 'RoomOnRent Demo Owner',
      email: 'demo-owner@roomonrent.local',
      phone: '9876543210',
      passwordHash: await bcrypt.hash('DemoOwner!2026', 12),
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Room.deleteMany({ demoSeed: true });
  const availableFrom = new Date();
  availableFrom.setDate(availableFrom.getDate() + 7);
  availableFrom.setUTCHours(0, 0, 0, 0);
  await Room.insertMany(listings.map(({ image, ...listing }) => ({
    ...listing,
    ownerId: demoOwner._id,
    ownerName: demoOwner.name,
    description: `${listing.title}. A welcoming, well-maintained place with direct owner contact and no brokerage. ${listing.amenities.join(', ')}.`,
    address: `${listing.locality}, ${listing.city}`,
    availableFrom,
    status: 'active',
    demoSeed: true,
    images: [`https://images.unsplash.com/${image}?auto=format&fit=crop&w=1000&q=85`],
  })));
  console.info(`Seeded ${listings.length} clearly marked demo room listings.`);
} finally {
  await mongoose.disconnect();
}
