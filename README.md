# Wency Discord Bot

Discord.js v14 ile geliştirilmiş private Discord bot altyapısı.

Bu proje private komut sistemi, guard botları, kayıt sistemi, ekonomi, stat, leaderboard, çekiliş ve özel oda özelliklerini içerir.

## Özellikler

- Discord.js v14 altyapısı
- Private bot ve guard bot desteği
- Kayıt ve yetkili komutları
- Ekonomi sistemi
- Stat ve leaderboard sistemi
- Özel oda sistemi
- Çekiliş sistemi
- Setup menüsü
- MongoDB veri sistemi
- PM2 ecosystem desteği

## Kurulum

Projeyi indirdikten sonra bağımlılıkları kur:

```bash
npm install
```

Ardından `System.js` dosyasını kendi sunucuna göre doldur.

## System.js Ayarları

```js
module.exports = {
    serverID: '',
    channelID: '',
    serverName: '',
    ownerID: [],
    database: '',

    Private: {
        Token: '',
        Prefix: ['.'],
    },

    Security: {
        Logger: '',
        Punish: '',
        Backup: '',
        Prefix: ['.'],
        Dists: [],
        BotsIDs: [],
    },
};
```

## Config Açıklamaları

| Alan | Açıklama |
| --- | --- |
| `serverID` | Botun çalışacağı sunucu ID |
| `channelID` | Botun bağlanacağı ses kanalı ID |
| `serverName` | PM2 process isminde kullanılacak sunucu adı |
| `ownerID` | Bot owner ID listesi |
| `database` | MongoDB bağlantı adresi |
| `Private.Token` | Ana private bot tokeni |
| `Security.Logger` | Guard logger bot tokeni |
| `Security.Punish` | Guard punish bot tokeni |
| `Security.Backup` | Guard backup bot tokeni |
| `Security.Dists` | Dağıtıcı bot tokenleri |
| `Security.BotsIDs` | Guard bot ID listesi |

## Başlatma

Tüm aktif botları PM2 ile başlatmak için:

```bash
npx pm2 start ecosystem.config.js
```

Sadece private botu manuel başlatmak için:

```bash
cd Bot/Private
node index.js
```

Guard botları manuel başlatmak için:

```bash
cd Bot/Guard/I
node index.js
```

```bash
cd Bot/Guard/II
node index.js
```

```bash
cd Bot/Guard/III
node index.js
```

## Komut Kategorileri

- `Auth`: Moderasyon, kayıt ve yetkili komutları
- `Economy`: Coin, market, evlilik ve oyun komutları
- `Fun`: Eğlence komutları
- `Global`: Genel kullanıcı komutları
- `Root`: Bot owner ve kurulum komutları
- `Stat`: İstatistik komutları

## Güvenlik

Public GitHub reposuna gerçek token, MongoDB URI, owner ID veya lokal veritabanı dosyası ekleme.

Bu dosyalar `.gitignore` ile hariç tutulur:

```gitignore
*.log
node_modules/
database.sqlite
backup.sqlite
*.sqlite
*.sqlite-journal
*.db
*.db-journal
```

## Lisans

ISC
