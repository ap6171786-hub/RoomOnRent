import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { config } from "./config.js";
import { Booking, Room, User } from "./models.js";

const demoPassword = process.env.DEMO_PASSWORD ?? "RoomOnRentDemo2026!";
const cities = ["Kanpur", "Lucknow", "Prayagraj", "Varanasi", "Delhi", "Agra"];
const types = ["Single Room", "Double Sharing", "Triple Sharing", "PG", "1BHK", "2BHK"] as const;
const titles = [
  "Sunny private room near the city center",
  "Quiet shared home with a leafy balcony",
  "Furnished room close to colleges",
  "Modern PG with meals and fast Wi-Fi",
  "Bright 1BHK in a peaceful neighborhood",
  "Spacious 2BHK with covered parking",
  "Cozy single room beside a metro stop",
  "Airy double sharing in a friendly home",
  "Well-kept room with an attached bathroom",
  "Newly renovated home near local markets",
  "Comfortable furnished room for students",
  "Calm top-floor room with natural light",
  "Secure PG with flexible move-in dates",
  "Independent 1BHK with a modular kitchen",
  "Family-ready 2BHK near a public park",
  "Affordable room in a gated community",
  "Sunlit room with dedicated work space",
  "Shared apartment with a welcoming host",
  "Premium PG with housekeeping included",
  "Compact 1BHK close to transit and shops",
  "Large 2BHK in a quiet residential lane",
  "Move-in-ready room with wardrobe",
  "Double room with a balcony and Wi-Fi",
  "PG room with round-the-clock security",
  "Furnished room in a well-connected area",
];
const photoIds = [
  "photo-1616486338812-3dadae4b4ace",
  "photo-1615874694520-474822394e73",
  "photo-1600210492486-724fe5c67fb0",
];

async function seed() {
  await mongoose.connect(config.MONGO_URI);
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const accounts = [
    { name: "RoomOnRent Admin", email: "admin@roomonrent.demo", role: "ADMIN" },
    ...Array.from({ length: 3 }, (_, index) => ({
      name: ["Aarav Sharma", "Meera Singh", "Kabir Verma"][index]!,
      email: `owner${index + 1}@roomonrent.demo`,
      role: "OWNER",
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      name: ["Ananya Gupta", "Rahul Patel", "Kavya Mishra", "Ishaan Khan", "Diya Joshi"][index]!,
      email: `tenant${index + 1}@roomonrent.demo`,
      role: "TENANT",
    })),
  ] as const;
  for (const account of accounts) {
    await User.updateOne(
      { email: account.email },
      { $set: { name: account.name, role: account.role, active: true, passwordHash }, $setOnInsert: { email: account.email } },
      { upsert: true },
    );
  }
  const owners = await User.find({ role: "OWNER", email: /^owner[1-3]@roomonrent\.demo$/ }).sort({ email: 1 });
  const tenants = await User.find({ role: "TENANT", email: /^tenant[1-5]@roomonrent\.demo$/ }).sort({ email: 1 });
  const roomIds: mongoose.Types.ObjectId[] = [];

  for (let index = 0; index < titles.length; index += 1) {
    const city = cities[index % cities.length]!;
    const owner = owners[index % owners.length]!;
    const room = await Room.findOneAndUpdate(
      { title: titles[index], city },
      {
        $set: {
          title: titles[index],
          description: `${titles[index]} in ${city}. This welcoming, well-maintained home has thoughtful essentials, a helpful host, and easy access to everyday shops and transit.`,
          city,
          address: `${index + 12}, ${["Civil Lines", "Gomti Nagar", "George Town", "Bhelupur", "Hauz Khas", "Sikandra"][index % cities.length]}, ${city}`,
          type: types[index % types.length]!,
          rent: 6500 + ((index * 1700) % 22000),
          deposit: 8000 + ((index * 1300) % 30000),
          images: [`https://images.unsplash.com/${photoIds[index % photoIds.length]}?auto=format&fit=crop&w=960&q=85`],
          amenities: ["Wi-Fi", "Furnished", ...(index % 2 === 0 ? ["Attached bathroom"] : []), ...(index % 3 === 0 ? ["Parking"] : [])],
          furnished: true,
          available: true,
          verifiedOwner: index % 3 !== 2,
          owner: owner._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    roomIds.push(room._id);
  }

  for (let index = 0; index < Math.min(5, tenants.length); index += 1) {
    const room = await Room.findById(roomIds[index]);
    if (!room) continue;
    await Booking.updateOne(
      { tenant: tenants[index]!._id, room: room._id },
      {
        $setOnInsert: {
          tenant: tenants[index]!._id,
          owner: room.owner,
          room: room._id,
          moveInDate: new Date(Date.now() + (index + 7) * 86_400_000),
          status: "PENDING",
          statusHistory: [{ status: "PENDING", changedAt: new Date() }],
        },
      },
      { upsert: true },
    );
  }
  console.log(`Seeded ${accounts.length} demo accounts and ${titles.length} rooms. Shared password: ${demoPassword}`);
  await mongoose.disconnect();
}

seed().catch(async (error: unknown) => {
  console.error("Demo seed failed", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
