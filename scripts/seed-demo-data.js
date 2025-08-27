const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo data...')

  // Create demo users
  const users = [
    {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      username: 'alice',
      password: 'password123',
    },
    {
      email: 'bob@example.com',
      name: 'Bob Smith',
      username: 'bob',
      password: 'password123',
    },
    {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      username: 'charlie',
      password: 'password123',
    },
    {
      email: 'diana@example.com',
      name: 'Diana Prince',
      username: 'diana',
      password: 'password123',
    },
    {
      email: 'edward@example.com',
      name: 'Edward Norton',
      username: 'edward',
      password: 'password123',
    },
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        username: userData.username,
        password: hashedPassword,
      },
    })

    console.log(`✅ Created user: ${user.name} (@${user.username})`)
  }

  // Create a demo direct conversation between Alice and Bob
  const alice = await prisma.user.findUnique({
    where: { email: 'alice@example.com' },
  })
  const bob = await prisma.user.findUnique({
    where: { email: 'bob@example.com' },
  })

  if (alice && bob) {
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false, // Direct conversation
        participants: {
          create: [{ userId: alice.id }, { userId: bob.id }],
        },
      },
    })

    // Add some demo messages
    const messages = [
      { content: 'Hey Bob! How are you doing?', senderId: alice.id },
      {
        content: "Hi Alice! I'm doing great, thanks for asking!",
        senderId: bob.id,
      },
      {
        content: "That's wonderful! Want to grab coffee later?",
        senderId: alice.id,
      },
      {
        content: 'Absolutely! That sounds great. 3 PM at the usual place?',
        senderId: bob.id,
      },
    ]

    for (const messageData of messages) {
      await prisma.message.create({
        data: {
          content: messageData.content,
          senderId: messageData.senderId,
          conversationId: conversation.id,
        },
      })
    }

    console.log('✅ Created demo direct conversation with messages')
  }

  // Create a demo group conversation
  const charlie = await prisma.user.findUnique({
    where: { email: 'charlie@example.com' },
  })
  const diana = await prisma.user.findUnique({
    where: { email: 'diana@example.com' },
  })
  const edward = await prisma.user.findUnique({
    where: { email: 'edward@example.com' },
  })

  if (alice && charlie && diana && edward) {
    const groupConversation = await prisma.conversation.create({
      data: {
        isGroup: true, // Group conversation
        groupName: 'Project Team Alpha',
        adminId: alice.id, // Alice is the admin
        participants: {
          create: [
            { userId: alice.id, role: 'admin' },
            { userId: charlie.id, role: 'member' },
            { userId: diana.id, role: 'member' },
            { userId: edward.id, role: 'member' },
          ],
        },
      },
    })

    // Add some demo group messages
    const groupMessages = [
      {
        content: 'Welcome everyone to Project Team Alpha!',
        senderId: alice.id,
      },
      {
        content: 'Thanks Alice! Excited to work with this team.',
        senderId: charlie.id,
      },
      {
        content: 'Same here! Looking forward to our collaboration.',
        senderId: diana.id,
      },
      {
        content: 'Great to meet everyone! When do we start?',
        senderId: edward.id,
      },
      {
        content: "Let's have our first meeting tomorrow at 10 AM.",
        senderId: alice.id,
      },
    ]

    for (const messageData of groupMessages) {
      await prisma.message.create({
        data: {
          content: messageData.content,
          senderId: messageData.senderId,
          conversationId: groupConversation.id,
        },
      })
    }

    console.log('✅ Created demo group conversation with messages')
  }

  // Create another demo group conversation
  if (bob && charlie && diana) {
    const socialGroup = await prisma.conversation.create({
      data: {
        isGroup: true,
        groupName: 'Weekend Warriors',
        adminId: bob.id, // Bob is the admin
        participants: {
          create: [
            { userId: bob.id, role: 'admin' },
            { userId: charlie.id, role: 'member' },
            { userId: diana.id, role: 'member' },
          ],
        },
      },
    })

    // Add some demo social group messages
    const socialMessages = [
      { content: "Who's up for hiking this weekend?", senderId: bob.id },
      {
        content: "I'm in! The weather looks perfect.",
        senderId: charlie.id,
      },
      {
        content: 'Count me in too! Which trail should we do?',
        senderId: diana.id,
      },
      {
        content: 'How about Mount Tam? Great views and not too strenuous.',
        senderId: bob.id,
      },
    ]

    for (const messageData of socialMessages) {
      await prisma.message.create({
        data: {
          content: messageData.content,
          senderId: messageData.senderId,
          conversationId: socialGroup.id,
        },
      })
    }

    console.log('✅ Created demo social group conversation with messages')
  }

  console.log('🎉 Demo data seeding completed!')
  console.log('')
  console.log('Demo accounts:')
  console.log('- alice@example.com / password123 (Admin of Project Team Alpha)')
  console.log('- bob@example.com / password123 (Admin of Weekend Warriors)')
  console.log('- charlie@example.com / password123')
  console.log('- diana@example.com / password123')
  console.log('- edward@example.com / password123')
  console.log('')
  console.log('Demo conversations:')
  console.log('- Direct chat: Alice ↔ Bob')
  console.log('- Group: Project Team Alpha (Alice, Charlie, Diana, Edward)')
  console.log('- Group: Weekend Warriors (Bob, Charlie, Diana)')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
