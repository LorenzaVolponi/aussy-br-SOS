/**
 * Frases de emergência multilíngues.
 * Para turistas estrangeiros sem idioma comum com socorristas brasileiros.
 * Cada frase tem versão em português + N idiomas estrangeiros.
 *
 * Idiomas priorizados:
 * - Inglês (universal)
 * - Espanhol (fronteiriços)
 * - Francês (guianas, africanos)
 * - Alemão (turistas)
 * - Italiano (turistas)
 * - Japonês (turistas)
 * - Chinês (turistas)
 * - Árabe (imigrantes)
 * - Russo (turistas)
 */

export interface Phrase {
  id: string
  category: 'emergency' | 'medical' | 'location' | 'needs' | 'identification'
  pt: string
  translations: Record<string, string>
}

export interface Language {
  code: string
  name: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'Inglês', flag: '🇺🇸' },
  { code: 'es', name: 'Espanhol', flag: '🇪🇸' },
  { code: 'fr', name: 'Francês', flag: '🇫🇷' },
  { code: 'de', name: 'Alemão', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: 'Japonês', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinês', flag: '🇨🇳' },
  { code: 'ar', name: 'Árabe', flag: '🇸🇦' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺' },
]

export const PHRASES: Phrase[] = [
  // EMERGÊNCIA
  {
    id: 'help',
    category: 'emergency',
    pt: 'Preciso de ajuda! Emergência!',
    translations: {
      en: 'I need help! Emergency!',
      es: '¡Necesito ayuda! ¡Emergencia!',
      fr: "J'ai besoin d'aide ! Urgence !",
      de: 'Ich brauche Hilfe! Notfall!',
      it: 'Ho bisogno di aiuto! Emergenza!',
      ja: '助けてください！緊急です！',
      zh: '我需要帮助！紧急情况！',
      ar: 'أحتاج مساعدة! طوارئ!',
      ru: 'Мне нужна помощь! Экстренная ситуация!',
    },
  },
  {
    id: 'call-ambulance',
    category: 'emergency',
    pt: 'Por favor, chame uma ambulância (ligue 192)',
    translations: {
      en: 'Please call an ambulance (dial 192)',
      es: 'Por favor, llame a una ambulancia (marque 192)',
      fr: "Veuillez appeler une ambulance (composez le 192)",
      de: 'Bitte rufen Sie einen Krankenwagen (192 wählen)',
      it: 'Si prega di chiamare un\'ambulanza (comporre 192)',
      ja: '救急車を呼んでください（192番）',
      zh: '请叫救护车（拨打192）',
      ar: 'يرجى الاتصال بسيارة إسعاف (الاتصال بـ 192)',
      ru: 'Пожалуйста, вызовите скорую (наберите 192)',
    },
  },
  {
    id: 'call-police',
    category: 'emergency',
    pt: 'Por favor, chame a polícia (ligue 190)',
    translations: {
      en: 'Please call the police (dial 190)',
      es: 'Por favor, llame a la policía (marque 190)',
      fr: "Veuillez appeler la police (composez le 190)",
      de: 'Bitte rufen Sie die Polizei (190 wählen)',
      it: 'Si prega di chiamare la polizia (comporre 190)',
      ja: '警察を呼んでください（190番）',
      zh: '请叫警察（拨打190）',
      ar: 'يرجى الاتصال بالشرطة (الاتصال بـ 190)',
      ru: 'Пожалуйста, вызовите полицию (наберите 190)',
    },
  },
  {
    id: 'fire',
    category: 'emergency',
    pt: 'Fogo! Incêndio! (bombeiros 193)',
    translations: {
      en: 'Fire! Fire! (firefighters 193)',
      es: '¡Fuego! ¡Incendio! (bomberos 193)',
      fr: 'Au feu ! Incendie ! (pompiers 193)',
      de: 'Feuer! Brand! (Feuerwehr 193)',
      it: 'Fuoco! Incendio! (vigili del fuoco 193)',
      ja: '火事です！（消防署193）',
      zh: '着火了！火灾！（消防193）',
      ar: 'حريق! حريق! (الإطفاء 193)',
      ru: 'Пожар! Пожар! (пожарные 193)',
    },
  },

  // MÉDICO
  {
    id: 'doctor',
    category: 'medical',
    pt: 'Preciso de um médico',
    translations: {
      en: 'I need a doctor',
      es: 'Necesito un médico',
      fr: "J'ai besoin d'un médecin",
      de: 'Ich brauche einen Arzt',
      it: 'Ho bisogno di un medico',
      ja: '医者が必要です',
      zh: '我需要医生',
      ar: 'أحتاج طبيب',
      ru: 'Мне нужен врач',
    },
  },
  {
    id: 'pain',
    category: 'medical',
    pt: 'Estou com dor aqui',
    translations: {
      en: 'I have pain here',
      es: 'Tengo dolor aquí',
      fr: "J'ai mal ici",
      de: 'Ich habe hier Schmerzen',
      it: 'Ho dolore qui',
      ja: 'ここが痛いです',
      zh: '我这里疼',
      ar: 'لدي ألم هنا',
      ru: 'У меня здесь боль',
    },
  },
  {
    id: 'allergy',
    category: 'medical',
    pt: 'Sou alérgico a:',
    translations: {
      en: 'I am allergic to:',
      es: 'Soy alérgico a:',
      fr: 'Je suis allergique à :',
      de: 'Ich bin allergisch gegen:',
      it: 'Sono allergico a:',
      ja: 'アレルギーがあります：',
      zh: '我对以下过敏：',
      ar: 'أعاني من حساسية تجاه:',
      ru: 'У меня аллергия на:',
    },
  },
  {
    id: 'medication',
    category: 'medical',
    pt: 'Tomo estes medicamentos:',
    translations: {
      en: 'I take these medications:',
      es: 'Tomo estos medicamentos:',
      fr: 'Je prends ces médicaments :',
      de: 'Ich nehme diese Medikamente:',
      it: 'Prendo questi farmaci:',
      ja: 'これらの薬を飲んでいます：',
      zh: '我在服用这些药物：',
      ar: 'أتناول هذه الأدوية:',
      ru: 'Я принимаю эти лекарства:',
    },
  },
  {
    id: 'blood-type',
    category: 'medical',
    pt: 'Meu tipo sanguíneo é',
    translations: {
      en: 'My blood type is',
      es: 'Mi tipo de sangre es',
      fr: 'Mon groupe sanguin est',
      de: 'Meine Blutgruppe ist',
      it: 'Il mio gruppo sanguigno è',
      ja: '私の血液型は',
      zh: '我的血型是',
      ar: 'فصيلة دمي هي',
      ru: 'Моя группа крови',
    },
  },
  {
    id: 'pregnant',
    category: 'medical',
    pt: 'Estou grávida',
    translations: {
      en: 'I am pregnant',
      es: 'Estoy embarazada',
      fr: 'Je suis enceinte',
      de: 'Ich bin schwanger',
      it: 'Sono incinta',
      ja: '妊娠しています',
      zh: '我怀孕了',
      ar: 'أنا حامل',
      ru: 'Я беременна',
    },
  },

  // LOCALIZAÇÃO
  {
    id: 'lost',
    category: 'location',
    pt: 'Estou perdido. Não sei onde estou',
    translations: {
      en: 'I am lost. I do not know where I am',
      es: 'Estoy perdido. No sé dónde estoy',
      fr: "Je suis perdu. Je ne sais pas où je suis",
      de: 'Ich bin verloren. Ich weiß nicht, wo ich bin',
      it: 'Mi sono perso. Non so dove mi trovo',
      ja: '迷子です。どこにいるかわかりません',
      zh: '我迷路了。我不知道我在哪里',
      ar: 'أضعت طريقي. لا أعرف أين أنا',
      ru: 'Я заблудился. Не знаю, где нахожусь',
    },
  },
  {
    id: 'my-location',
    category: 'location',
    pt: 'Minha localização é (coords)',
    translations: {
      en: 'My location is (coords)',
      es: 'Mi ubicación es (coords)',
      fr: 'Ma position est (coords)',
      de: 'Mein Standort ist (Koordinaten)',
      it: 'La mia posizione è (coord)',
      ja: '私の現在地は（座標）',
      zh: '我的位置是（坐标）',
      ar: 'موقعي هو (إحداثيات)',
      ru: 'Моё местоположение (координаты)',
    },
  },
  {
    id: 'need-directions',
    category: 'location',
    pt: 'Como chego ao hospital mais próximo?',
    translations: {
      en: 'How do I get to the nearest hospital?',
      es: '¿Cómo llego al hospital más cercano?',
      fr: "Comment puis-je aller à l'hôpital le plus proche ?",
      de: 'Wie komme ich zum nächsten Krankenhaus?',
      it: 'Come arrivo all\'ospedale più vicino?',
      ja: '一番近い病院への行き方は？',
      zh: '怎么去最近的医院？',
      ar: 'كيف أصل إلى أقرب مستشفى؟',
      ru: 'Как добраться до ближайшей больницы?',
    },
  },

  // NECESSIDADES
  {
    id: 'water',
    category: 'needs',
    pt: 'Preciso de água potável',
    translations: {
      en: 'I need drinking water',
      es: 'Necesito agua potable',
      fr: "J'ai besoin d'eau potable",
      de: 'Ich brauche Trinkwasser',
      it: 'Ho bisogno di acqua potabile',
      ja: '飲料水が必要です',
      zh: '我需要饮用水',
      ar: 'أحتاج ماء صالح للشرب',
      ru: 'Мне нужна питьевая вода',
    },
  },
  {
    id: 'food',
    category: 'needs',
    pt: 'Preciso de comida',
    translations: {
      en: 'I need food',
      es: 'Necesito comida',
      fr: "J'ai besoin de nourriture",
      de: 'Ich brauche Essen',
      it: 'Ho bisogno di cibo',
      ja: '食べ物が必要です',
      zh: '我需要食物',
      ar: 'أحتاج طعام',
      ru: 'Мне нужна еда',
    },
  },
  {
    id: 'shelter',
    category: 'needs',
    pt: 'Preciso de abrigo',
    translations: {
      en: 'I need shelter',
      es: 'Necesito refugio',
      fr: "J'ai besoin d'un abri",
      de: 'Ich brauche eine Unterkunft',
      it: 'Ho bisogno di un rifugio',
      ja: '避難場所が必要です',
      zh: '我需要避难所',
      ar: 'أحتاج مأوى',
      ru: 'Мне нужно убежище',
    },
  },
  {
    id: 'phone',
    category: 'needs',
    pt: 'Posso usar seu telefone?',
    translations: {
      en: 'Can I use your phone?',
      es: '¿Puedo usar su teléfono?',
      fr: 'Puis-je utiliser votre téléphone ?',
      de: 'Darf ich Ihr Telefon benutzen?',
      it: 'Posso usare il suo telefono?',
      ja: '電話を使わせていただけますか？',
      zh: '可以让我用一下您的电话吗？',
      ar: 'هل يمكنني استخدام هاتفك؟',
      ru: 'Можно воспользоваться вашим телефоном?',
    },
  },

  // IDENTIFICAÇÃO
  {
    id: 'name',
    category: 'identification',
    pt: 'Meu nome é',
    translations: {
      en: 'My name is',
      es: 'Mi nombre es',
      fr: 'Je m\'appelle',
      de: 'Mein Name ist',
      it: 'Mi chiamo',
      ja: '私の名前は',
      zh: '我的名字是',
      ar: 'اسمي هو',
      ru: 'Меня зовут',
    },
  },
  {
    id: 'country',
    category: 'identification',
    pt: 'Sou de (país)',
    translations: {
      en: 'I am from (country)',
      es: 'Soy de (país)',
      fr: 'Je viens de (pays)',
      de: 'Ich komme aus (Land)',
      it: 'Vengo da (paese)',
      ja: '（国）から来ました',
      zh: '我来自（国家）',
      ar: 'أنا من (بلد)',
      ru: 'Я из (страна)',
    },
  },
  {
    id: 'no-portuguese',
    category: 'identification',
    pt: 'Não falo português',
    translations: {
      en: 'I do not speak Portuguese',
      es: 'No hablo portugués',
      fr: 'Je ne parle pas portugais',
      de: 'Ich spreche kein Portugiesisch',
      it: 'Non parlo portoghese',
      ja: 'ポルトガル語が話せません',
      zh: '我不会说葡萄牙语',
      ar: 'لا أتحدث البرتغالية',
      ru: 'Я не говорю по-португальски',
    },
  },
  {
    id: 'thank-you',
    category: 'identification',
    pt: 'Muito obrigado pela ajuda',
    translations: {
      en: 'Thank you very much for your help',
      es: 'Muchas gracias por su ayuda',
      fr: 'Merci beaucoup pour votre aide',
      de: 'Vielen Dank für Ihre Hilfe',
      it: 'Grazie mille per il vostro aiuto',
      ja: '助けていただきありがとうございます',
      zh: '非常感谢您的帮助',
      ar: 'شكراً جزيلاً على مساعدتكم',
      ru: 'Большое спасибо за помощь',
    },
  },
]

export const CATEGORY_LABELS: Record<Phrase['category'], string> = {
  emergency: 'Emergência',
  medical: 'Médico',
  location: 'Localização',
  needs: 'Necessidades',
  identification: 'Identificação',
}
