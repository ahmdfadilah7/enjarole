import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';

const sampleUsers = [
  {
    username: 'aldric_sw',
    displayName: 'Aldric Stormwind',
    email: 'aldric@demo.enjarole',
    bio: 'Kesatria dari benteng utara. Menjaga perbatasan dan mencari rekan petualang.',
    backstory: 'Lahir di desa pegunungan Greyhold, Aldric dilatih sejak kecil untuk menjadi penjaga kerajaan. Pedangnya, Dawnbreaker, diturunkan dari kakeknya.',
    personalityTraits: ['Berani', 'Setia', 'Disiplin'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=aldric_sw',
  },
  {
    username: 'luna_vesper',
    displayName: 'Luna Vesper',
    email: 'luna@demo.enjarole',
    bio: 'Penyihir bulan yang menyukai ramuan dan astronomi.',
    backstory: 'Dibesarkan di menara Silverveil, Luna belajar sihir dari buku kuno ibunya. Ia sering memetakan konstelasi untuk meramal cuaca sihir.',
    personalityTraits: ['Cerdas', 'Tenang', 'Misterius'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=luna_vesper',
  },
  {
    username: 'kaito_ren',
    displayName: 'Kaito Ren',
    email: 'kaito@demo.enjarole',
    bio: 'Pencuri bayaran dengan hati yang tidak terduga.',
    backstory: 'Mantan anggota guild bayangan, Kaito kini bekerja sendiri. Ia hanya mengambil kontrak yang menurutnya adil—meski dunia tidak selalu setuju.',
    personalityTraits: ['Cepat', 'Licik', 'Humoris'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=kaito_ren',
  },
  {
    username: 'sera_bloom',
    displayName: 'Seraphina Bloom',
    email: 'sera@demo.enjarole',
    bio: 'Pendeta hutan yang menyembuhkan luka fisik dan batin.',
    backstory: 'Seraphina menemukan kuil kuno di balik air terjun Emerald Veil. Dari situlah ia belajar sihir penyembuhan yang diturunkan para druid purba.',
    personalityTraits: ['Penyayang', 'Sabar', 'Optimis'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=sera_bloom',
  },
  {
    username: 'magnus_iron',
    displayName: 'Magnus Ironforge',
    email: 'magnus@demo.enjarole',
    bio: 'Pandai besi kerdil yang membuat senjata legendaris.',
    backstory: 'Di bengkel bawah tanah Forgeheart, Magnus menempa benda-benda ajaib untuk para pahlawan. Setiap paluannya membawa mantra kuno klan Ironforge.',
    personalityTraits: ['Tekun', 'Jujur', 'Pemarah'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=magnus_iron',
  },
  {
    username: 'yuki_frost',
    displayName: 'Yuki Frost',
    email: 'yuki@demo.enjarole',
    bio: 'Penyihir es dari tanah salju abadi.',
    backstory: 'Yuki adalah satu-satunya penyintas desa yang membeku oleh kutukan naga es. Ia berkelana mencari cara mematahkan kutukan itu tanpa kehilangan kekuatannya.',
    personalityTraits: ['Dingin', 'Tegas', 'Setia'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=yuki_frost',
  },
  {
    username: 'rafael_cross',
    displayName: 'Rafael Cross',
    email: 'rafael@demo.enjarole',
    bio: 'Pemburu hadiah yang tidak pernah melewatkan jejak.',
    backstory: 'Rafael pernah menjadi tentara bayaran kerajaan selatan. Setelah perang berakhir, ia memilih hidup bebas mengejar target-target paling berbahaya di benua.',
    personalityTraits: ['Tajam', 'Mandiri', 'Penuh perhitungan'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=rafael_cross',
  },
  {
    username: 'mira_leaf',
    displayName: 'Mira Sunleaf',
    email: 'mira@demo.enjarole',
    bio: 'Druid muda penjaga hutan Verdant Reach.',
    backstory: 'Mira bisa berbicara dengan roh pohon. Ia memimpin kawanan rubah kecil yang membantunya mengawasi ancaman terhadap hutan suci.',
    personalityTraits: ['Alami', 'Gentle', 'Waswas'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=mira_leaf',
  },
  {
    username: 'dante_shade',
    displayName: 'Dante Nightshade',
    email: 'dante@demo.enjarole',
    bio: 'Ahli sihir gelap yang mencari keseimbangan antara hidup dan mati.',
    backstory: 'Dante diusir dari akademi sihir karena eksperimen nekromansinya. Ia percaya kematian bukan akhir, melainkan gerbang yang harus dipahami.',
    personalityTraits: ['Gelap', 'Filosofis', 'Introvert'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=dante_shade',
  },
  {
    username: 'aria_star',
    displayName: 'Aria Celestine',
    email: 'aria@demo.enjarole',
    bio: 'Bard perjalanan yang menyimpan cerita dari setiap kota.',
    backstory: 'Aria mengembara dengan lute ajaibnya, Starwhisper. Lagunya bisa mengingatkan orang pada kenangan yang terlupakan—atau menghapusnya untuk selamanya.',
    personalityTraits: ['Karismatik', 'Bebas', 'Penasaran'],
    avatarUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=aria_star',
  },
];

const samplePosts = [
  'Hari ini latihan pedang di pelataran benteng. Otot masih pegal, tapi semangat membara! ⚔️',
  'Ramuan bulan purnama akhirnya jadi. Warnanya indah seperti cahaya perak.',
  'Berhasil menyelinap ke gudang bandit tanpa ketahuan. Misi selesai, bayaran menunggu.',
  'Menyembuhkan penduduk desa yang terkena racun jamur. Syukurlah semuanya selamat.',
  'Pedang baru selesai ditempa! Tiga hari tiga malam tanpa tidur. Hasilnya memuaskan.',
  'Salju turun lebih tebal dari biasanya. Ada sesuatu yang bergerak di balik badai.',
  'Target berhasil ditangkap setelah pengejaran 40 km. Tidak ada yang lari dari jejakku.',
  'Pohon elder memberi tahu ada perambah di utara hutan. Aku sudah mengirim peringatan.',
  'Malam ini meditasi di kuburan kuno. Roh-roh di sini punya banyak cerita untuk didengar.',
  'Pertunjukan di tavern kota pelabuhan berjalan hebat! Hadiahnya: cerita legenda naga.',
  'Bertemu dengan pedagang aneh di pasar. Dia menjual peta ke dungeon yang belum terpetakan.',
  'Konstelasi Orion terlihat jelas malam ini. Pertanda awal musim petualangan baru.',
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const createdIds: string[] = [];

  console.log('🌱 Seeding 10 sample users...\n');

  for (const user of sampleUsers) {
    const character = await prisma.character.upsert({
      where: { email: user.email },
      update: {
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

  // Sample posts (1–2 per user, random)
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

  // Random follows
  console.log('🔗 Creating random follows...');
  for (let i = 0; i < createdIds.length; i++) {
    const targets = createdIds.filter((_, idx) => idx !== i);
    const followCount = 2 + (i % 3);
    const shuffled = targets.sort(() => Math.random() - 0.5).slice(0, followCount);

    for (const followingId of shuffled) {
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: createdIds[i],
            followingId,
          },
        },
        update: {},
        create: {
          followerId: createdIds[i],
          followingId,
        },
      });
    }
  }

  console.log('\n✅ Seed selesai!\n');
  console.log('Login semua akun demo dengan:');
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.log('Akun contoh:');
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
