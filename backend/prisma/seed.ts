import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';
const DEMO_EMAIL_DOMAIN = 'demo.enjarole';

type SampleUser = {
  username: string;
  displayName: string;
  email: string;
  bio: string;
  backstory: string;
  personalityTraits: string[];
  avatarUrl: string;
};

const firstNames = [
  'Aldric', 'Luna', 'Kaito', 'Seraphina', 'Magnus', 'Yuki', 'Rafael', 'Mira', 'Dante', 'Aria',
  'Raka', 'Sinta', 'Bima', 'Nadia', 'Farhan', 'Elara', 'Thorne', 'Vera', 'Orion', 'Selene',
  'Hiro', 'Cassandra', 'Erik', 'Lyra', 'Zephyr', 'Isolde', 'Caius', 'Nyx', 'Rowan', 'Freya',
];

const epithets = [
  'stormwind', 'vesper', 'nightshade', 'ironforge', 'frost', 'sunleaf', 'cross', 'bloom', 'shade', 'star',
  'ember', 'mistral', 'dawn', 'dusk', 'river', 'stone', 'flame', 'whisper', 'thorn', 'sky',
  'moon', 'ash', 'vale', 'peak', 'glen', 'marsh', 'cliff', 'breeze', 'spark', 'rune',
];

const archetypes = [
  {
    role: 'Kesatria',
    bio: (place: string) => `Penjaga ${place}. Bertarung demi yang lemah dan mencari rekan setia.`,
    backstory: (name: string, place: string) =>
      `${name} dilatih sejak muda di ${place}. Pedangnya adalah simbol sumpah yang tidak pernah ia langgar.`,
    traits: [['Berani', 'Setia', 'Disiplin'], ['Tegas', 'Protektif', 'Jujur'], ['Stoik', 'Loyal', 'Taktis']],
  },
  {
    role: 'Penyihir',
    bio: (place: string) => `Penyihir dari ${place} yang mempelajari mantra kuno dan ilusi.`,
    backstory: (name: string, place: string) =>
      `Di menara ${place}, ${name} menghabiskan tahun demi tahun mempelajari sihir dari buku-buku usang.`,
    traits: [['Cerdas', 'Tenang', 'Misterius'], ['Penasaran', 'Fokus', 'Introvert'], ['Kreatif', 'Sabaran', 'Analitis']],
  },
  {
    role: 'Pencuri',
    bio: (place: string) => `Bayangan ${place} yang hanya mengambil kontrak yang menurutnya adil.`,
    backstory: (name: string, place: string) =>
      `${name} tumbuh di jalanan ${place}. Kelincahannya menyelamatkan nyawanya lebih dari sekali.`,
    traits: [['Cepat', 'Licik', 'Humoris'], ['Mandiri', 'Waswas', 'Praktis'], ['Fleksibel', 'Dingin', 'Setia']],
  },
  {
    role: 'Druid',
    bio: (place: string) => `Penjaga alam dari ${place} yang mendengar bisikan hutan.`,
    backstory: (name: string, place: string) =>
      `${name} menemukan kuil kuno di ${place} dan belajar sihir alam dari roh-roh penjaga.`,
    traits: [['Penyayang', 'Sabar', 'Optimis'], ['Alami', 'Gentle', 'Tenang'], ['Protektif', 'Bijak', 'Misterius']],
  },
  {
    role: 'Pemburu',
    bio: (place: string) => `Pemburu hadiah dari ${place} yang tidak pernah melewatkan jejak.`,
    backstory: (name: string, place: string) =>
      `Setelah meninggalkan ${place}, ${name} memilih hidup bebas mengejar target paling berbahaya di benua.`,
    traits: [['Tajam', 'Mandiri', 'Penuh perhitungan'], ['Fokus', 'Dingin', 'Tekun'], ['Cepat', 'Jeli', 'Disiplin']],
  },
  {
    role: 'Bard',
    bio: (place: string) => `Pengembara dari ${place} yang menyimpan cerita dari setiap kota.`,
    backstory: (name: string, place: string) =>
      `${name} mengembara keluar dari ${place} dengan alat musik ajaib yang bisa mengingatkan kenangan terlupakan.`,
    traits: [['Karismatik', 'Bebas', 'Penasaran'], ['Humoris', 'Empati', 'Ekspresif'], ['Sosial', 'Kreatif', 'Impulsif']],
  },
];

const places = [
  'benteng utara', 'menara Silverveil', 'guild bayangan', 'hutan Verdant Reach', 'Forgeheart',
  'tanah salju abadi', 'kota pelabuhan selatan', 'lembah Emerald Veil', 'kuburan kuno', 'pasar malam',
  'desa pegunungan', 'pulau kabut', 'kastil terapung', 'gua kristal', 'rawa senja',
];

const samplePosts = [
  'Hari ini latihan pedang di pelataran benteng. Otot masih pegal, tapi semangat membara!',
  'Ramuan bulan purnama akhirnya jadi. Warnanya indah seperti cahaya perak.',
  'Berhasil menyelinap ke gudang bandit tanpa ketahuan. Misi selesai, bayaran menunggu.',
  'Menyembuhkan penduduk desa yang terkena racun jamur. Syukurlah semuanya selamat.',
  'Pedang baru selesai ditempa! Tiga hari tiga malam tanpa tidur. Hasilnya memuaskan.',
  'Salju turun lebih tebal dari biasanya. Ada sesuatu yang bergerak di balik badai.',
  'Target berhasil ditangkap setelah pengejaran panjang. Tidak ada yang lari dari jejakku.',
  'Pohon elder memberi tahu ada perambah di utara hutan. Aku sudah mengirim peringatan.',
  'Malam ini meditasi di kuburan kuno. Roh-roh di sini punya banyak cerita untuk didengar.',
  'Pertunjukan di tavern kota pelabuhan berjalan hebat! Hadiahnya: cerita legenda naga.',
  'Bertemu dengan pedagang aneh di pasar. Dia menjual peta ke dungeon yang belum terpetakan.',
  'Konstelasi terlihat jelas malam ini. Pertanda awal musim petualangan baru.',
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateRandomUsers(count: number): SampleUser[] {
  const usedUsernames = new Set<string>();
  const users: SampleUser[] = [];

  const names = shuffle(firstNames);
  const tags = shuffle(epithets);

  for (let i = 0; i < count; i++) {
    const firstName = names[i % names.length];
    const epithet = tags[i % tags.length];
    let username = `${firstName.toLowerCase()}_${epithet}`;

    let suffix = 1;
    while (usedUsernames.has(username)) {
      username = `${firstName.toLowerCase()}_${epithet}${suffix}`;
      suffix += 1;
    }
    usedUsernames.add(username);

    const archetype = pick(archetypes);
    const place = pick(places);
    const displayName = `${firstName} ${epithet.charAt(0).toUpperCase()}${epithet.slice(1)}`;
    const traits = pick(archetype.traits);

    users.push({
      username,
      displayName,
      email: `${username}@${DEMO_EMAIL_DOMAIN}`,
      bio: archetype.bio(place),
      backstory: archetype.backstory(firstName, place),
      personalityTraits: traits,
      avatarUrl: `https://api.dicebear.com/9.x/adventurer/png?seed=${username}`,
    });
  }

  return users;
}

async function resetDemoRelations(characterIds: string[]) {
  if (characterIds.length === 0) return;

  await prisma.like.deleteMany({ where: { characterId: { in: characterIds } } });
  await prisma.comment.deleteMany({ where: { characterId: { in: characterIds } } });
  await prisma.post.deleteMany({ where: { characterId: { in: characterIds } } });
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: { in: characterIds } },
        { followingId: { in: characterIds } },
      ],
    },
  });
}

async function main() {
  const sampleUsers = generateRandomUsers(10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const createdIds: string[] = [];

  const existingDemoUsers = await prisma.character.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  await resetDemoRelations(existingDemoUsers.map((user) => user.id));

  console.log('🌱 Seeding 10 random demo users...\n');

  for (const user of sampleUsers) {
    const character = await prisma.character.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        backstory: user.backstory,
        personalityTraits: user.personalityTraits,
        avatarUrl: user.avatarUrl,
        passwordHash,
      },
      create: {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        backstory: user.backstory,
        personalityTraits: user.personalityTraits,
        avatarUrl: user.avatarUrl,
        passwordHash,
      },
    });

    createdIds.push(character.id);
    console.log(`  ✓ @${character.username} — ${character.displayName}`);
  }

  const staleDemoUsers = existingDemoUsers.filter((user) => !createdIds.includes(user.id));
  if (staleDemoUsers.length > 0) {
    await prisma.character.deleteMany({
      where: { id: { in: staleDemoUsers.map((user) => user.id) } },
    });
  }

  console.log('\n📝 Creating sample posts...');
  for (let i = 0; i < createdIds.length; i++) {
    const postCount = 1 + (i % 2);
    for (let j = 0; j < postCount; j++) {
      const content = samplePosts[(i + j) % samplePosts.length];
      await prisma.post.create({
        data: {
          characterId: createdIds[i],
          content,
          mediaUrls: j === 0 && i % 3 === 0
            ? [`https://picsum.photos/seed/${sampleUsers[i].username}-1/600/600`]
            : [],
        },
      });
    }
  }

  console.log('🔗 Creating random follows...');
  for (let i = 0; i < createdIds.length; i++) {
    const targets = createdIds.filter((_, idx) => idx !== i);
    const followCount = 2 + (i % 3);
    const shuffled = shuffle(targets).slice(0, followCount);

    for (const followingId of shuffled) {
      await prisma.follow.create({
        data: {
          followerId: createdIds[i],
          followingId,
        },
      });
    }
  }

  console.log('\n✅ Seed selesai!\n');
  console.log('Login semua akun demo dengan:');
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.log('Akun yang dibuat:');
  for (const user of sampleUsers) {
    console.log(`  ${user.email}  →  @${user.username}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
