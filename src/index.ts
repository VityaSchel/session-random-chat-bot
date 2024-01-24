import { initializeSession, EventEmitter, sendMessage } from 'session-messenger-nodejs'

import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url)) + '/'

type SessionID = string

type State = {
  state: 'searching'
} | {
  state: 'chatting'
  with: SessionID
}

const users = new Map<SessionID, State>()
const usersLanguages = new Map<SessionID, 'en' | 'ru'>()

await initializeSession({ profileDataPath: __dirname + '../session-data' })
const events = new EventEmitter()
events.on('message', async (message, conversation) => {
  if (!conversation.isPrivate()) return

  if(message.dataMessage) {
    const user = conversation.id as SessionID
    const text = message.dataMessage.body?.trim()
    if(users.has(user)) {
      const userState = users.get(user)!
      if (userState.state === 'chatting' && text === '/next') {
        await replyTo(user, {
          en: 'Searching for new person...\n\nTo stop searching: /stop',
          ru: 'Поиск нового собеседника...\n\nОстановить поиск: /stop'
        })
        endDialog(user, userState.with)
        startSearch(user)
        return
      } else if (text === '/stop') {
        if (userState.state === 'chatting') {
          await replyTo(user, {
            en: 'Chat ended.\n\nFind a new person to chat: /start',
            ru: 'Диалог завершен.\n\nНайти другого собеседника: /start'
          })
          endDialog(user, userState.with)
          startSearch(user)
        } else {
          await replyTo(user, {
            en: 'Search stopped.\n\nFind a person to chat: /start',
            ru: 'Поиск остановлен.\n\nНайти собеседника: /start'
          })
          stopSearch(user)
        }
        return
      } else if(userState.state === 'chatting') {
        await sendMessage(userState.with, {
          body: text ?? '',
          attachments: undefined,
          quote: undefined,
          preview: undefined,
          groupInvitation: undefined
        })
        return
      } else {
        await replyTo(user, {
          en: 'Currently we\'re searching for a person to chat with...\n\nTo stop searching: /stop',
          ru: 'Идет поиск нового собеседника...\n\nОстановить поиск: /stop'
        })
        return
      }
    } else {
      if (!usersLanguages.has(user)) {
        if(text === '/ru') {
          usersLanguages.set(user, 'ru')
        } else if(text === '/en') {
          usersLanguages.set(user, 'en')
        } else {
          await sendMessage(user, {
            body: 'Выберите язык / Choose language\n\n/ru — Русский\n/en — English',
            attachments: undefined,
            quote: undefined,
            preview: undefined,
            groupInvitation: undefined
          })
          return
        }
      }

      const fallback = async () => {
        await replyTo(user, {
          en: 'Welcome to the chat! Use /start to find a person to chat with (it\'s anonymous). \n\nThis bot is opensource! https://github.com/VityaSchel/session-random-chat-bot\nCreated by hloth.dev',
          ru: 'Добро пожаловать в чат! Используйте /start чтобы найти собеседника (это анонимно).\n\nЭтот бот с открытым кодом! https://github.com/VityaSchel/session-random-chat-bot\nРазработан hloth.dev'
        })
      }

      if (!text) fallback()
      
      switch(text) {
        case '/start':
          await replyTo(user, {
            en: 'Searching for a person to chat with...\n\nTo stop searching: /stop',
            ru: 'Поиск нового собеседника...\n\nОстановить поиск: /stop'
          })
          startSearch(user)
          break
        default:
          fallback()
      }
    }
    
  }
})

async function replyTo(user: string, messages: { en: string, ru: string }) {
  const language = usersLanguages.get(user)
  if (!language) return
  await sendMessage(user, {
    body: messages[language],
    attachments: undefined,
    quote: undefined,
    preview: undefined,
    groupInvitation: undefined
  })
}

async function startSearch(initiator: string) {
  users.set(initiator, { state: 'searching' })
  for(const [userID, userState] of users.entries()) {
    if (userState.state === 'searching' && userID !== initiator) {
      const interlocutor = userID
      users.set(interlocutor, { state: 'chatting', with: initiator })
      users.set(initiator, { state: 'chatting', with: interlocutor })
      await replyTo(initiator, {
        en: 'Found a person to chat with!\n\nTo find a new person: /next\nTo end the dialog: /stop',
        ru: 'Найден собеседник!\n\nНайти другого собеседника: /next\nЗавершить диалог: /stop'
      })
      await replyTo(interlocutor, {
        en: 'Found a person to chat with!\n\nTo find a new person: /next\nTo end the dialog: /stop',
        ru: 'Найден собеседник!\n\nНайти другого собеседника: /next\nЗавершить диалог: /stop'
      })
      return
    }
  }
}

async function stopSearch(user: string) {
  users.delete(user)
}

async function endDialog(initiator: string, partner: string) {
  users.delete(initiator)
  users.delete(partner)
  await replyTo(partner, {
    en: 'Your interlocutor has ended the dialog.\n\nFind a new person to chat: /start',
    ru: 'Ваш собеседник завершил диалог.\n\nНайти другого собеседника: /start' 
  })
}