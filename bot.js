// ═══════════════════════════════════════════════════════
//  SRZFPS BOT DISCORD - bot.js
//  Installe: npm install discord.js lowdb
//  Lance: node bot.js
// ═══════════════════════════════════════════════════════

import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes,
  PermissionFlagsBits } from 'discord.js';
import { JSONFilePreset } from 'lowdb/node';

// ─── CONFIG ─────────────────────────────────────────────
const CONFIG = {
  TOKEN: process.env.TOKEN,
  CLIENT_ID:    '1516884532069007380',
  GUILD_ID:     '1516769445023060121',
  GAME_URL:     'https://euphonious-lamington-7cbdb1.netlify.app',
  DAILY_POINTS: 50,
  WIN_POINTS:   200,
  KILL_POINTS:  25,
};

// ─── DATABASE ────────────────────────────────────────────
const db = await JSONFilePreset('srzfps_data.json', { players: {}, matches: [] });

// ─── HELPERS ─────────────────────────────────────────────
function getOrCreate(id, username) {
  if (!db.data.players[id]) {
    db.data.players[id] = {
      id, username,
      points: 0, wins: 0, losses: 0,
      kills: 0, deaths: 0, last_daily: null,
      created_at: new Date().toISOString()
    };
    db.write();
  }
  return db.data.players[id];
}

function getRank(pts) {
  if (pts < 500)   return { name: '🥉 Bronze',  color: 0xCD7F32, emoji: '🥉' };
  if (pts < 1500)  return { name: '🥈 Argent',  color: 0xC0C0C0, emoji: '🥈' };
  if (pts < 3000)  return { name: '🥇 Or',      color: 0xFFD700, emoji: '🥇' };
  if (pts < 6000)  return { name: '💎 Diamant', color: 0x00BFFF, emoji: '💎' };
  if (pts < 10000) return { name: '👑 Master',  color: 0x9B59B6, emoji: '👑' };
  return                  { name: '🌟 Légende', color: 0xFF6B35, emoji: '🌟' };
}

function addPts(id, amount, username) {
  const p = getOrCreate(id, username);
  p.points += amount;
  p.username = username;
  db.write();
  return p.points;
}

// ─── COMMANDS ────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName('srzfps').setDescription('📋 Panneau de commande SRZFPS'),
  new SlashCommandBuilder().setName('profil').setDescription('👤 Voir un profil')
    .addUserOption(o => o.setName('joueur').setDescription('Le joueur (optionnel)')),
  new SlashCommandBuilder().setName('classement').setDescription('🏆 Top classement du serveur'),
  new SlashCommandBuilder().setName('daily').setDescription('🎁 Réclame tes +50 pts journaliers'),
  new SlashCommandBuilder().setName('jouer').setDescription('🎮 Créer ou rejoindre une partie 1v1')
    .addStringOption(o => o.setName('code').setDescription('Code de partie à rejoindre (vide = créer)')),
  new SlashCommandBuilder().setName('resultat').setDescription('📊 Enregistrer le résultat d\'une partie')
    .addStringOption(o => o.setName('code').setDescription('Code de la partie').setRequired(true))
    .addUserOption(o => o.setName('gagnant').setDescription('Le gagnant').setRequired(true))
    .addIntegerOption(o => o.setName('kills_gagnant').setDescription('Kills du gagnant'))
    .addIntegerOption(o => o.setName('kills_perdant').setDescription('Kills du perdant')),
  new SlashCommandBuilder().setName('aide').setDescription('❓ Ouvrir un ticket de support'),
  new SlashCommandBuilder().setName('admin_points').setDescription('🔧 [ADMIN] Modifier les points')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('joueur').setDescription('Le joueur').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('Montant (négatif pour retirer)').setRequired(true)),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
  await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), {
    body: commands.map(c => c.toJSON())
  });
  console.log('✅ Commandes enregistrées !');
}

// ─── CLIENT ──────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', async () => {
  console.log(`✅ ${client.user.tag} est en ligne !`);
  client.user.setActivity('SRZFPS | /srzfps', { type: 0 });
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  const { user } = interaction;

  // ══ SLASH COMMANDS ══
  if (interaction.isChatInputCommand()) {
    const cmd = interaction.commandName;

    // /srzfps
    if (cmd === 'srzfps') {
      const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('🎮 SRZFPS — Panneau de Commande')
        .setDescription('Bienvenue sur **SRZFPS**, le FPS compétitif du serveur !')
        .addFields(
          { name: '⚔️ Comment faire un 1v1', value: '1. Tape `/jouer` → tu reçois un code\n2. Partage le code à ton adversaire\n3. Il tape `/jouer code:SRZ-XXXX`\n4. Après la partie, tape `/resultat` pour les points', inline: false },
          { name: '🎯 Training', value: 'Ouvre le jeu et choisis **Training** pour t\'entraîner sur des cibles', inline: false },
          { name: '📋 Commandes', value: '`/jouer` — Créer/rejoindre une partie\n`/classement` — Top du serveur\n`/profil` — Voir un profil\n`/daily` — +50 pts/jour\n`/resultat` — Enregistrer une victoire', inline: false },
          { name: '🏆 Rangs', value: '🥉 Bronze → 🥈 Argent → 🥇 Or → 💎 Diamant → 👑 Master → 🌟 Légende', inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('🎮 Jouer').setStyle(ButtonStyle.Link).setURL(CONFIG.GAME_URL),
        new ButtonBuilder().setCustomId('btn_classement').setLabel('🏆 Classement').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_daily').setLabel('🎁 Daily').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_profil').setLabel('👤 Mon Profil').setStyle(ButtonStyle.Secondary),
      );
      await interaction.reply({ embeds: [embed], components: [row] });
    }

    // /profil
    else if (cmd === 'profil') {
      const target = interaction.options.getUser('joueur') || user;
      const p = getOrCreate(target.id, target.username);
      const rank = getRank(p.points);
      const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toString();
      const wr = (p.wins + p.losses) > 0 ? Math.round(p.wins / (p.wins + p.losses) * 100) + '%' : 'N/A';

      const embed = new EmbedBuilder()
        .setColor(rank.color)
        .setTitle(`${rank.emoji} Profil de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '🏅 Rang',      value: `**${rank.name}**`,             inline: true },
          { name: '⭐ Points',    value: `**${p.points.toLocaleString()}**`, inline: true },
          { name: '🎮 Parties',   value: `${p.wins + p.losses}`,         inline: true },
          { name: '🏆 Victoires', value: `${p.wins}`,                    inline: true },
          { name: '💀 Défaites',  value: `${p.losses}`,                  inline: true },
          { name: '📊 Win Rate',  value: wr,                             inline: true },
          { name: '⚔️ Kills',    value: `${p.kills}`,                    inline: true },
          { name: '☠️ Deaths',   value: `${p.deaths}`,                   inline: true },
          { name: '📈 K/D',      value: `**${kd}**`,                     inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // /classement
    else if (cmd === 'classement') {
      const players = Object.values(db.data.players).sort((a, b) => b.points - a.points).slice(0, 10);
      if (players.length === 0) return interaction.reply({ content: 'Aucun joueur encore !', ephemeral: true });

      const medals = ['🥇', '🥈', '🥉'];
      const lines = players.map((p, i) => {
        const rank = getRank(p.points);
        return `${medals[i] || `**${i+1}.**`} **${p.username}** ${rank.emoji} — ${p.points.toLocaleString()} pts | ${p.wins}V/${p.losses}D`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Classement SRZFPS')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Joue des 1v1 pour monter !' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('🎮 Jouer').setStyle(ButtonStyle.Link).setURL(CONFIG.GAME_URL)
        )
      ]});
    }

    // /daily
    else if (cmd === 'daily') {
      const p = getOrCreate(user.id, user.username);
      const today = new Date().toISOString().split('T')[0];

      if (p.last_daily === today) {
        const heures = Math.ceil((new Date().setHours(24,0,0,0) - Date.now()) / 3600000);
        return interaction.reply({ content: `⏰ Déjà réclamé ! Reviens dans **${heures}h**`, ephemeral: true });
      }

      const newPts = addPts(user.id, CONFIG.DAILY_POINTS, user.username);
      db.data.players[user.id].last_daily = today;
      db.write();

      const embed = new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🎁 Points Journaliers !')
        .setDescription(`**+${CONFIG.DAILY_POINTS} points** reçus !`)
        .addFields(
          { name: '⭐ Total', value: `${newPts.toLocaleString()} pts`, inline: true },
          { name: '🏅 Rang',  value: getRank(newPts).name,            inline: true },
        )
        .setFooter({ text: 'Reviens demain !' })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // /jouer
    else if (cmd === 'jouer') {
      const code = interaction.options.getString('code');
      getOrCreate(user.id, user.username);

      let gameUrl, description;
      if (code) {
        const clean = code.toUpperCase();
        gameUrl = `${CONFIG.GAME_URL}?code=${clean}&player=${encodeURIComponent(user.username)}`;
        description = `Rejoins la partie **\`${clean}\`** en cliquant sur le bouton !`;
      } else {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const newCode = 'SRZ-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        gameUrl = `${CONFIG.GAME_URL}?code=${newCode}&player=${encodeURIComponent(user.username)}&host=1`;
        description = `**${user.username}** crée une partie !\n\n🔑 Code : **\`${newCode}\`**\n\nTon adversaire tape : \`/jouer code:${newCode}\``;
      }

      const embed = new EmbedBuilder()
        .setColor(0x7C3AED)
        .setTitle('⚔️ Partie 1v1 SRZFPS')
        .setDescription(description)
        .addFields(
          { name: '🏆 Récompenses', value: `Victoire → **+${CONFIG.WIN_POINTS} pts**\nPar kill → **+${CONFIG.KILL_POINTS} pts**`, inline: false },
          { name: '📊 Après la partie', value: 'Tape `/resultat` pour enregistrer le score et recevoir tes points !', inline: false },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('🎮 Rejoindre la partie').setStyle(ButtonStyle.Link).setURL(gameUrl)
        )
      ]});
    }

    // /resultat
    else if (cmd === 'resultat') {
      const code       = interaction.options.getString('code').toUpperCase();
      const winner     = interaction.options.getUser('gagnant');
      const killsW     = interaction.options.getInteger('kills_gagnant') || 0;
      const killsL     = interaction.options.getInteger('kills_perdant') || 0;
      const loser      = winner.id === user.id ? null : user;

      getOrCreate(winner.id, winner.username);
      const gainTotal = CONFIG.WIN_POINTS + killsW * CONFIG.KILL_POINTS;
      const newPts = addPts(winner.id, gainTotal, winner.username);
      db.data.players[winner.id].wins++;
      db.data.players[winner.id].kills  += killsW;
      db.data.players[winner.id].deaths += killsL;
      db.write();

      if (loser) {
        getOrCreate(loser.id, loser.username);
        addPts(loser.id, killsL * CONFIG.KILL_POINTS, loser.username);
        db.data.players[loser.id].losses++;
        db.data.players[loser.id].kills  += killsL;
        db.data.players[loser.id].deaths += killsW;
        db.write();
      }

      db.data.matches.push({ code, winner_id: winner.id, killsW, killsL, date: new Date().toISOString() });
      db.write();

      const rank = getRank(newPts);
      const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle(`🏆 Résultat — ${code}`)
        .setDescription(`**${winner.username}** remporte la partie !`)
        .addFields(
          { name: '🏆 Gagnant', value: `${winner.username} — ${killsW} kills`,                              inline: true },
          { name: '💀 Perdant', value: loser ? `${loser.username} — ${killsL} kills` : 'Non renseigné',     inline: true },
          { name: '⭐ Gain',    value: `+${gainTotal} pts`,                                                  inline: false },
          { name: '📊 Total',   value: `${newPts.toLocaleString()} pts`,                                     inline: true },
          { name: '🏅 Rang',    value: rank.name,                                                            inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    // /admin_points
    else if (cmd === 'admin_points') {
      const target = interaction.options.getUser('joueur');
      const pts    = interaction.options.getInteger('points');
      const total  = addPts(target.id, pts, target.username);
      await interaction.reply({
        content: `✅ **${pts > 0 ? '+' : ''}${pts}** pts → **${target.username}** a maintenant **${total}** pts`,
        ephemeral: true
      });
    }
  }

  // ══ BOUTONS ══
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_classement') {
      const players = Object.values(db.data.players).sort((a, b) => b.points - a.points).slice(0, 10);
      if (!players.length) return interaction.reply({ content: 'Aucun joueur !', ephemeral: true });
      const medals = ['🥇', '🥈', '🥉'];
      const lines = players.map((p, i) => `${medals[i] || `**${i+1}.**`} **${p.username}** ${getRank(p.points).emoji} — ${p.points.toLocaleString()} pts`);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 Classement').setDescription(lines.join('\n'))], ephemeral: true });
    }

    else if (interaction.customId === 'btn_daily') {
      const p = getOrCreate(user.id, user.username);
      const today = new Date().toISOString().split('T')[0];
      if (p.last_daily === today) return interaction.reply({ content: '⏰ Déjà réclamé aujourd\'hui !', ephemeral: true });
      const newPts = addPts(user.id, CONFIG.DAILY_POINTS, user.username);
      db.data.players[user.id].last_daily = today;
      db.write();
      await interaction.reply({ content: `🎁 **+${CONFIG.DAILY_POINTS} pts** ! Total : **${newPts}** pts`, ephemeral: true });
    }

    else if (interaction.customId === 'btn_profil') {
      const p = getOrCreate(user.id, user.username);
      const rank = getRank(p.points);
      const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toString();
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(rank.color).setTitle(`${rank.emoji} ${user.username}`).addFields(
          { name: '🏅 Rang',    value: rank.name,                inline: true },
          { name: '⭐ Points',  value: p.points.toLocaleString(), inline: true },
          { name: '🎮 Parties', value: `${p.wins + p.losses}`,   inline: true },
          { name: '⚔️ Kills',  value: `${p.kills}`,              inline: true },
          { name: '📈 K/D',    value: kd,                        inline: true },
          { name: '🏆 W/L',    value: `${p.wins}/${p.losses}`,   inline: true },
        )],
        ephemeral: true
      });
    }
  }
});

client.login(CONFIG.TOKEN);

// ═══════════════════════════════════════════════════════
//  SYSTÈME DE TICKETS & ASSISTANCE IA
// ═══════════════════════════════════════════════════════

// ─── BOUTON TICKET ───────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { user } = interaction;

  // Ouvrir un ticket
  if (interaction.customId === 'btn_ticket') {
    const guild = interaction.guild;
    const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const existing = guild.channels.cache.find(c => c.name === `ticket-${safeName}`);
    if (existing) return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : ${existing}`, ephemeral: true });

    const ticketChannel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: 0,
      parent: interaction.channel.parentId,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: ['ViewChannel'] },
        { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: guild.members.me.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle('🎫 Ticket de Support SRZFPS')
      .setDescription(`Bonjour **${user.username}** !\n\nDécris ton problème ci-dessous et le staff te répondra dès que possible.\n\n> 🤖 Le bot répond automatiquement aux questions fréquentes !`)
      .addFields({ name: '📋 Questions fréquentes', value: '• Problème de points → utilise `/resultat` après chaque partie\n• Bug dans le jeu → décris-le ici\n• Signaler un joueur → donne son pseudo\n• Autre → explique ici' })
      .setFooter({ text: 'Un admin fermera ce ticket une fois résolu.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger),
    );

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ton ticket a été créé : ${ticketChannel}`, ephemeral: true });
  }

  // Fermer un ticket
  if (interaction.customId === 'btn_close_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) return;
    await interaction.reply({ content: '🔒 Ticket fermé — suppression dans 5 secondes...' });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// ─── ASSISTANCE IA DANS LES TICKETS ─────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.channel.name?.startsWith('ticket-')) return;

  const c = message.content.toLowerCase();
  let rep = null;

  if (c.includes('point') && (c.includes('reçu') || c.includes('manque') || c.includes('pas')))
    rep = '💡 **Points manquants ?**\nAprès chaque partie, tape `/resultat code:TON-CODE gagnant:@pseudo` pour que les points soient distribués. Sans cette commande, rien n\'est attribué automatiquement !';
  else if (c.includes('triche') || c.includes('cheat') || c.includes('hack'))
    rep = '🚨 **Signalement de triche**\nMerci ! Un admin va examiner ça. Donne-nous le pseudo exact du joueur et si possible une preuve (screenshot ou clip).';
  else if (c.includes('1v1') || c.includes('rejoindre') || c.includes('code de partie'))
    rep = '🎮 **Comment faire un 1v1 ?**\n1. Tape `/jouer` → tu reçois un code ex: `SRZ-A8K2`\n2. Partage le code\n3. L\'adversaire tape `/jouer code:SRZ-A8K2`\n4. Cliquez sur **Rejoindre la partie**\n5. Après → `/resultat` pour les points !';
  else if (c.includes('rang') || c.includes('monter') || c.includes('classement'))
    rep = '🏆 **Rangs**\n🥉 Bronze — 0 pts\n🥈 Argent — 500 pts\n🥇 Or — 1 500 pts\n💎 Diamant — 3 000 pts\n👑 Master — 6 000 pts\n🌟 Légende — 10 000 pts\n\nGagne des 1v1 et fais `/daily` chaque jour !';
  else if (c.includes('daily') || c.includes('journalier'))
    rep = '🎁 **Points journaliers**\nTape `/daily` une fois par jour pour recevoir **+50 points** automatiquement !';
  else if (c.includes('bug') || c.includes('marche pas') || c.includes('fonctionne pas'))
    rep = '🔧 **Problème technique**\nDécris ton bug :\n• Quel navigateur utilises-tu ?\n• Que se passe-t-il exactement ?\n• Est-ce que ça arrive à chaque fois ?\n\nUn admin va regarder ça !';

  if (rep) {
    const embed = new EmbedBuilder()
      .setColor(0x7C3AED)
      .setTitle('🤖 Assistance IA SRZFPS')
      .setDescription(rep)
      .setFooter({ text: 'Réponse automatique • Un admin peut aussi t\'aider !' });
    await message.reply({ embeds: [embed] });
  }
});

// ─── COMMANDE /aide ───────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'aide') return;

  const embed = new EmbedBuilder()
    .setColor(0x00D4FF)
    .setTitle('# ❓ Aide & Support SRZFPS')
    .setDescription('> Tu as un problème ? On est là pour t\'aider !')
    .addFields(
      { name: '🎫 Ouvrir un ticket', value: 'Clique sur le bouton ci-dessous pour créer un salon privé avec le staff.', inline: false },
      { name: '🤖 Assistance IA', value: 'Le bot répond automatiquement aux questions fréquentes dans ton ticket !', inline: false },
      { name: '📋 FAQ Rapide', value: '• Points manquants → `/resultat` après la partie\n• Faire un 1v1 → `/jouer`\n• Points journaliers → `/daily`\n• Voir son profil → `/profil`', inline: false },
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_ticket').setLabel('🎫 Ouvrir un ticket').setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
});
