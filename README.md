# Bootleg-Password-Vault
A password vault with client-side encryption and nice-looking UI built with React.

Check it out at https://northstrix.github.io/Bootleg-Password-Vault/

The source code of this app is also available at:
- https://sourceforge.net/projects/bootleg-password-vault/
- https://codeberg.org/Northstrix/Bootleg-Password-Vault

The related article can be found at https://medium.com/@Northstrix/adbd8dad0442

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Welcoming%20notice.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Account%20Created%20Successfully%20Notification%20OK%20button%20is%20hovered.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Username%20is%20already%20taken%20error.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Account%20doesn't%20exist%20error.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Underlying%20Cryptography.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/UI%20for%20user%20records%20(the%20Login%20from%20Medium%20line%20is%20hovered).png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/UI%20for%20user%20records%20(dark%20mode).png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/new%20record%20form.png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/chrome_abF88M0q3k.gif?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/Confirm%20delete%20window%20(YES%20button%20is%20hovered).png?raw=true)

![image text](https://github.com/Northstrix/Bootleg-Password-Vault/blob/main/media/chrome_mr1DTLaXQY.gif?raw=true)

# Firestore rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Match user-specific documents based on user email
    match /{userEmail}/{recordId} {
      // Allow all authenticated users to create records
      allow create: if request.auth != null;
      // Allow read and delete for the owner
      allow read, delete: if request.auth != null && request.auth.token.email == userEmail;
    }
  }
}
```

# Credit

The existence of this project (at least in its current form) wouldn't've been possible without the following:

[Weekly Coding Challenge #1 - Double slider Sign in/up Form - Desktop Only](https://codepen.io/FlorinPop17/pen/vPKWjd) by [Florin Pop](https://codepen.io/FlorinPop17)

Image by [ran](https://pixabay.com/users/greissdesign-30789/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=1905188) from [Pixabay](https://pixabay.com/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=1905188)

[Neon Button](https://codepen.io/HighFlyer/pen/WNXRZBv) by [Thea](https://codepen.io/HighFlyer)

[Push Notifications](https://codepen.io/FlorinPop17/pen/xxORmaB) by [Florin Pop](https://codepen.io/FlorinPop17)

[すりガラスなプロフィールカード](https://codepen.io/ash_creator/pen/zYaPZLB) by [あしざわ - Webクリエイター](https://codepen.io/ash_creator)

[Daily UI#011 | Flash Message (Error/Success)](https://codepen.io/juliepark/pen/vjMOKQ) by [Julie Park](https://codepen.io/juliepark)

[React Chat App Full Tutorial 2024 | Realtime Chat Application Project with Firebase](https://www.youtube.com/watch?v=domt_Sx-wTY) by [Lama Dev](https://www.youtube.com/@LamaDev)

[Interactive Loose-Leaf Todo List](https://codepen.io/IanWoodard/pen/eYyVzzq) by [Ian](https://codepen.io/IanWoodard)

[Named scroll-timeline vertical](https://codepen.io/utilitybend/pen/VwBRNwm) by [utilitybend](https://codepen.io/utilitybend)

[The prismatic forms](https://codepen.io/nourabusoud/pen/BxJbjJ) by [Nour Saud](https://codepen.io/nourabusoud)

[Pure Css Dark Mode toggle](https://codepen.io/alvarotrigo/pen/wvPRrZW) by [Álvaro](https://codepen.io/alvarotrigo)

[深海なボタン](https://codepen.io/ash_creator/pen/GRGZYyV) by [あしざわ - Webクリエイター](https://codepen.io/ash_creator)

[チェックしないと押せないボタン](https://codepen.io/ash_creator/pen/JjZReNm) by [あしざわ - Webクリエイター](https://codepen.io/ash_creator)

[crypto-js](https://github.com/brix/crypto-js) by [brix](https://github.com/brix)

[mipher](https://github.com/mpaland/mipher) by [mpaland](https://github.com/mpaland)

[hash-wasm](https://github.com/Daninet/hash-wasm) by [Daninet](https://github.com/Daninet)

[twofish](https://github.com/wouldgo/twofish) by [wouldgo](https://github.com/wouldgo)

[firebase-js-sdk](https://github.com/firebase/firebase-js-sdk) by [firebase](https://github.com/firebase/firebase-js-sdk)
