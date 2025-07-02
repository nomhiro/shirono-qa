// Cosmos DBの質問データを確認するデバッグスクリプト
require('dotenv').config({ path: '.env.local' });

const { CosmosClient } = require('@azure/cosmos');

async function debugQuestions() {
  try {
    console.log('🔍 Debugging Cosmos DB questions data...');
    
    // Cosmos DB接続
    const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
    const database = client.database(process.env.COSMOS_DB_DATABASE_NAME);
    
    // 全ユーザー確認
    console.log('\n👥 Users:');
    const usersContainer = database.container('users');
    const { resources: users } = await usersContainer.items.readAll().fetchAll();
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - Admin: ${user.isAdmin} - Group: ${user.groupId}`);
    });
    
    // 全グループ確認
    console.log('\n👥 Groups:');
    const groupsContainer = database.container('groups');
    const { resources: groups } = await groupsContainer.items.readAll().fetchAll();
    console.log(`Found ${groups.length} groups:`);
    groups.forEach(group => {
      console.log(`- ${group.name} (${group.id}): ${group.description}`);
    });
    
    // 全質問確認
    console.log('\n❓ Questions:');
    const questionsContainer = database.container('questions');
    const { resources: questions } = await questionsContainer.items.readAll().fetchAll();
    console.log(`Found ${questions.length} questions:`);
    questions.forEach(question => {
      console.log(`- ${question.title} (ID: ${question.id})`);
      console.log(`  Author: ${question.authorId}, Group: ${question.groupId}`);
      console.log(`  Status: ${question.status}, Priority: ${question.priority}`);
      console.log(`  Created: ${question.createdAt}`);
      console.log('');
    });
    
    // 管理者アカウントでアクセス可能な質問確認
    const adminUser = users.find(u => u.isAdmin);
    if (adminUser) {
      console.log(`🔑 Admin user: ${adminUser.username} (${adminUser.groupId})`);
      console.log('Admin should see all questions');
      
      // 管理者が属するグループ
      const adminGroup = groups.find(g => g.id === adminUser.groupId);
      if (adminGroup) {
        console.log(`Admin belongs to group: ${adminGroup.name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugQuestions();