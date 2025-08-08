"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface Sparkle {
  id: string
  x: number
  y: number
  letter: string
  color: string
}

const ANNOYING_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#FFC0CB', '#90EE90', '#FFB6C1', '#20B2AA'
]

// Voice categorization and letter mapping
const VOICE_CATEGORIES = {
  male: [] as SpeechSynthesisVoice[],
  female: [] as SpeechSynthesisVoice[],
  kids: [] as SpeechSynthesisVoice[]
}

// Assign voice types to letters for maximum chaos
const LETTER_VOICE_MAP: { [key: string]: 'male' | 'female' | 'kids' } = {
  'a': 'female', 'b': 'male', 'c': 'kids', 'd': 'female', 'e': 'male',
  'f': 'kids', 'g': 'female', 'h': 'male', 'i': 'kids', 'j': 'female',
  'k': 'male', 'l': 'kids', 'm': 'female', 'n': 'male', 'o': 'kids',
  'p': 'female', 'q': 'male', 'r': 'kids', 's': 'female', 't': 'male',
  'u': 'kids', 'v': 'female', 'w': 'male', 'x': 'kids', 'y': 'female', 'z': 'male'
}

const VOICE_SETTINGS_BY_TYPE = {
  male: [
    { rate: 0.8, pitch: 0.3 },
    { rate: 1.2, pitch: 0.5 },
    { rate: 2.0, pitch: 0.2 }
  ],
  female: [
    { rate: 1.5, pitch: 1.8 },
    { rate: 2.2, pitch: 1.5 },
    { rate: 1.0, pitch: 2.0 }
  ],
  kids: [
    { rate: 2.5, pitch: 2.0 },
    { rate: 3.0, pitch: 1.9 },
    { rate: 2.8, pitch: 1.7 }
  ]
}

// Emotion detection based on letter combinations
const EMOTION_PATTERNS = {
  angry: ['gr', 'rr', 'gg', 'ff', 'xx', 'zz', 'kk', 'qq'],
  happy: ['ha', 'he', 'hi', 'ho', 'la', 'ya', 'jo', 'we'],
  sad: ['oo', 'uu', 'ww', 'mm', 'nn', 'bo', 'so', 'no'],
  excited: ['ee', 'aa', 'ii', 'wow', 'yes', 'go', 'up', 'fun']
}

const EMOTION_VOICE_SETTINGS = {
  angry: { rate: 2.5, pitch: 0.2, volume: 1 },
  happy: { rate: 1.8, pitch: 1.9, volume: 0.9 },
  sad: { rate: 0.6, pitch: 0.4, volume: 0.7 },
  excited: { rate: 3.0, pitch: 2.0, volume: 1 },
  neutral: { rate: 1.5, pitch: 1.0, volume: 0.8 }
}

const EMOTION_MESSAGES = {
  angry: ['GRRR!', 'ARGH!', 'RAGE!', 'MAD!'],
  happy: ['YAY!', 'WOOHOO!', 'HAPPY!', 'JOY!'],
  sad: ['BOOHOO!', 'SNIFF!', 'WAAH!', 'TEARS!'],
  excited: ['AMAZING!', 'WOW!', 'AWESOME!', 'YEAH!']
}

export default function LettuceSpeak() {
  const [showIntro, setShowIntro] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [clickCount, setClickCount] = useState(0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Load and categorize voices
  useEffect(() => {
    const loadVoices = () => {
    try {
      const voices = speechSynthesis.getVoices()
      console.log('Available voices:', voices.length, voices.map(v => v.name))
      
      if (voices.length > 0) {
        setAvailableVoices(voices)
        
        // Reset categories
        VOICE_CATEGORIES.male = []
        VOICE_CATEGORIES.female = []
        VOICE_CATEGORIES.kids = []
        
        // Categorize voices by gender/age (best effort based on name patterns)
        VOICE_CATEGORIES.male = voices.filter(voice => 
          voice.name.toLowerCase().includes('male') ||
          voice.name.toLowerCase().includes('man') ||
          voice.name.toLowerCase().includes('david') ||
          voice.name.toLowerCase().includes('alex') ||
          voice.name.toLowerCase().includes('daniel') ||
          voice.name.toLowerCase().includes('fred') ||
          voice.name.toLowerCase().includes('jorge') ||
          voice.name.toLowerCase().includes('thomas') ||
          voice.name.toLowerCase().includes('microsoft david') ||
          voice.name.toLowerCase().includes('google uk english male')
        )
        
        VOICE_CATEGORIES.female = voices.filter(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('anna') ||
          voice.name.toLowerCase().includes('kate') ||
          voice.name.toLowerCase().includes('zoe') ||
          voice.name.toLowerCase().includes('microsoft zira') ||
          voice.name.toLowerCase().includes('google uk english female')
        )
        
        // For kids voices, look for higher pitch or specific names
        VOICE_CATEGORIES.kids = voices.filter(voice => 
          voice.name.toLowerCase().includes('child') ||
          voice.name.toLowerCase().includes('kid') ||
          voice.name.toLowerCase().includes('junior') ||
          voice.name.toLowerCase().includes('young')
        )
        
        // Fallback: distribute remaining voices
        const usedVoices = [...VOICE_CATEGORIES.male, ...VOICE_CATEGORIES.female, ...VOICE_CATEGORIES.kids]
        const remainingVoices = voices.filter(voice => !usedVoices.includes(voice))
        
        // Distribute remaining voices evenly
        remainingVoices.forEach((voice, index) => {
          if (index % 3 === 0) VOICE_CATEGORIES.male.push(voice)
          else if (index % 3 === 1) VOICE_CATEGORIES.female.push(voice)
          else VOICE_CATEGORIES.kids.push(voice)
        })
        
        // Ensure each category has at least one voice
        if (VOICE_CATEGORIES.male.length === 0 && voices.length > 0) {
          VOICE_CATEGORIES.male.push(voices[0])
        }
        if (VOICE_CATEGORIES.female.length === 0 && voices.length > 1) {
          VOICE_CATEGORIES.female.push(voices[1])
        }
        if (VOICE_CATEGORIES.kids.length === 0 && voices.length > 2) {
          VOICE_CATEGORIES.kids.push(voices[2])
        }
        
        console.log('Voice categories:', {
          male: VOICE_CATEGORIES.male.length,
          female: VOICE_CATEGORIES.female.length,
          kids: VOICE_CATEGORIES.kids.length
        })
        
        setVoicesLoaded(true)
      }
    } catch (error) {
      console.log('Error loading voices:', error)
    }
  }
  
  // Load voices immediately if available
  loadVoices()
  
  // Also listen for voices changed event (some browsers load voices asynchronously)
  speechSynthesis.addEventListener('voiceschanged', loadVoices)
  
  // Force reload after a delay for some browsers
  setTimeout(loadVoices, 1000)
  
  return () => {
    speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }
}, [])

  // Unskippable intro
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance("Welcome to LettuceSpeak! The site that does less than nothing! Prepare for maximum annoyance!")
          utterance.rate = 1.2
          utterance.pitch = 1.5
          utterance.volume = 1
          speechSynthesis.speak(utterance)
        }
        setTimeout(() => setShowIntro(false), 8000)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [showIntro])

  // Generate keyboard click sound
  const playClickSound = useCallback(() => {
    if (!audioContextRef.current) return
    
    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audioContextRef.current.currentTime)
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)
    
    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.1)
  }, [])

  // Vibrate on mobile
  const vibratePattern = useCallback(() => {
    if ('vibrate' in navigator) {
      const patterns = [
        [100, 50, 100],
        [200, 100, 50, 100, 200],
        [50, 50, 50, 50, 50],
        [300, 200, 100]
      ]
      navigator.vibrate(patterns[Math.floor(Math.random() * patterns.length)])
    }
  }, [])

  // Detect emotion based on recent letters
  const detectEmotion = useCallback((currentInput: string): 'angry' | 'happy' | 'sad' | 'excited' | 'neutral' => {
    const lastTwoLetters = currentInput.slice(-2).toLowerCase()
    const lastThreeLetters = currentInput.slice(-3).toLowerCase()
    
    // Check for patterns in recent input
    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (lastTwoLetters.includes(pattern) || lastThreeLetters.includes(pattern)) {
          return emotion as 'angry' | 'happy' | 'sad' | 'excited'
        }
      }
    }
    
    // Random emotion chance (10% for chaos)
    if (Math.random() < 0.1) {
      const emotions = ['angry', 'happy', 'sad', 'excited'] as const
      return emotions[Math.floor(Math.random() * emotions.length)]
    }
    
    return 'neutral'
  }, [])

  // Add emotional sparkle effect
  const addEmotionalSparkle = useCallback((letter: string, emotion: string) => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return

    // Emotion-based colors
    const emotionColors = {
      angry: ['#FF0000', '#FF4500', '#DC143C', '#B22222'],
      happy: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00'],
      sad: ['#4169E1', '#0000FF', '#483D8B', '#6495ED'],
      excited: ['#FF1493', '#FF6347', '#FF4500', '#FFD700'],
      neutral: ANNOYING_COLORS
    }

    const colors = emotionColors[emotion as keyof typeof emotionColors] || ANNOYING_COLORS
    
    const sparkle: Sparkle = {
      id: Math.random().toString(36),
      x: rect.left + Math.random() * rect.width,
      y: rect.top + Math.random() * rect.height,
      letter: letter.toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)]
    }

    setSparkles(prev => [...prev, sparkle])
    
    // Remove sparkle after animation
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => s.id !== sparkle.id))
    }, 2000)
  }, [])

  // Enhanced speak letter with emotional voice categorization and error handling
  const speakLetter = useCallback((letter: string, emotion: 'angry' | 'happy' | 'sad' | 'excited' | 'neutral' = 'neutral') => {
  try {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to prevent queuing issues
      speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(letter.toUpperCase())
      
      // Get voice type for this letter
      const voiceType = LETTER_VOICE_MAP[letter.toLowerCase()] || 'female'
      const voiceCategory = VOICE_CATEGORIES[voiceType]
      
      // Select random voice from category
      if (voiceCategory.length > 0) {
        const randomVoice = voiceCategory[Math.floor(Math.random() * voiceCategory.length)]
        utterance.voice = randomVoice
      } else if (availableVoices.length > 0) {
        // Fallback to any available voice
        utterance.voice = availableVoices[Math.floor(Math.random() * availableVoices.length)]
      }
      
      // Apply emotion-specific settings
      const emotionSettings = EMOTION_VOICE_SETTINGS[emotion]
      utterance.rate = Math.max(0.1, Math.min(10, emotionSettings.rate)) // Clamp values
      utterance.pitch = Math.max(0, Math.min(2, emotionSettings.pitch))
      utterance.volume = Math.max(0, Math.min(1, emotionSettings.volume))
      
      // Add error handling
      utterance.onerror = (event) => {
        console.log('Speech synthesis error:', event.error)
      }
      
      utterance.onstart = () => {
        console.log('Speech started for:', letter)
      }
      
      speechSynthesis.speak(utterance)
      
      // Sometimes add emotional outbursts
      if (emotion !== 'neutral' && Math.random() < 0.3) {
        setTimeout(() => {
          try {
            const messages = EMOTION_MESSAGES[emotion as keyof typeof EMOTION_MESSAGES]
            if (messages) {
              const emotionalUtterance = new SpeechSynthesisUtterance(
                messages[Math.floor(Math.random() * messages.length)]
              )
              emotionalUtterance.rate = Math.max(0.1, Math.min(10, emotionSettings.rate * 1.2))
              emotionalUtterance.pitch = Math.max(0, Math.min(2, emotionSettings.pitch))
              emotionalUtterance.volume = Math.max(0, Math.min(1, emotionSettings.volume * 0.8))
              
              if (voiceCategory.length > 0) {
                emotionalUtterance.voice = voiceCategory[Math.floor(Math.random() * voiceCategory.length)]
              } else if (availableVoices.length > 0) {
                emotionalUtterance.voice = availableVoices[Math.floor(Math.random() * availableVoices.length)]
              }
              
              speechSynthesis.speak(emotionalUtterance)
            }
          } catch (error) {
            console.log('Emotional outburst error:', error)
          }
        }, 300)
      }
    } else {
      console.log('Speech synthesis not supported')
    }
  } catch (error) {
    console.log('Speech synthesis error:', error)
  }
}, [voicesLoaded, availableVoices])

  // Handle key input with emotions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      speakLetter("NOPE!", 'angry')
      setBgColor('#FF0000') // Angry red
      playClickSound()
      vibratePattern()
      return
    }

    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      const newInput = inputValue + e.key
      const emotion = detectEmotion(newInput)
      
      // Play multiple click sounds
      for (let i = 0; i <= clickCount; i++) {
        setTimeout(() => playClickSound(), i * 50)
      }
      setClickCount(prev => prev + 1)
      
      // Speak the letter with emotion
      speakLetter(e.key, emotion)
      
      // Add emotional sparkle
      addEmotionalSparkle(e.key, emotion)
      
      // Flash background based on emotion
      const emotionBgColors = {
        angry: ['#FF0000', '#FF4500', '#DC143C'],
        happy: ['#FFD700', '#FFA500', '#ADFF2F'],
        sad: ['#4169E1', '#0000FF', '#483D8B'],
        excited: ['#FF1493', '#FF6347', '#FFD700'],
        neutral: ANNOYING_COLORS
      }
      const bgColors = emotionBgColors[emotion] || ANNOYING_COLORS
      setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)])
      
      // Vibrate
      vibratePattern()
      
      // Update input
      setInputValue(newInput)
    }
  }, [clickCount, speakLetter, playClickSound, addEmotionalSparkle, vibratePattern, inputValue, detectEmotion])

  if (showIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 animate-pulse">
        <div className="text-center p-8 bg-white rounded-lg shadow-2xl border-8 border-yellow-400 animate-bounce">
          <h1 className="text-6xl font-bold text-green-600 mb-4 animate-spin">🥬 LettuceSpeak! 🥬</h1>
          <p className="text-2xl text-red-500 font-bold animate-pulse">Loading maximum annoyance...</p>
          <div className="mt-4 flex justify-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-rainbow rounded-full animate-bounce" style={{animationDelay: `${i * 0.2}s`, background: ANNOYING_COLORS[i]}} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen p-8 transition-colors duration-100 relative overflow-hidden text-red-600"
      style={{ backgroundColor: bgColor }}
    >
      {/* Sparkles */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="fixed text-6xl font-bold pointer-events-none animate-spin z-50"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            color: sparkle.color,
            animation: 'spin 2s linear infinite, bounce 2s ease-in-out infinite, pulse 1s ease-in-out infinite'
          }}
        >
          {sparkle.letter}✨
        </div>
      ))}

      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-8xl font-bold mb-8 animate-bounce drop-shadow-lg text-yellow-300">
          🥬 LettuceSpeak! 🥬
        </h1>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-2xl border-8 border-yellow-400 mb-8">
          <h2 className="text-3xl font-bold text-red-600 mb-4 animate-pulse">
            Type ANY letter and prepare for MAXIMUM ANNOYANCE!
          </h2>
          
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={() => {}} // Controlled by keydown only
              onKeyDown={handleKeyDown}
              className="w-full text-4xl p-6 border-8 border-rainbow rounded-lg text-center font-bold bg-yellow-100 focus:outline-none focus:ring-8 focus:ring-red-500 animate-pulse text-black"
              placeholder="Start typing to unleash chaos..."
              autoFocus
              style={{
                background: `linear-gradient(45deg, ${ANNOYING_COLORS.join(', ')})`,
                backgroundSize: '400% 400%',
                animation: 'gradient 2s ease infinite'
              }}
            />
          </div>
          
          <div className="mt-4">
            <button
              onClick={() => {
                console.log('Testing speech synthesis...')
                console.log('Voices loaded:', voicesLoaded)
                console.log('Available voices:', availableVoices.length)
                speakLetter('TEST', 'excited')
              }}
              className="bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600"
            >
              🔊 TEST SPEECH (Click if no sound!)
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-pink-200 to-blue-200 rounded-lg border-4 border-purple-500">
            <h3 className="text-xl font-bold text-purple-800 mb-2">🎭 Voice Chaos System!</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-blue-100 p-2 rounded border-2 border-blue-400">
                <p className="font-bold text-blue-800">👨 MALE VOICES</p>
                <p className="text-xs">B, E, H, K, N, Q, T, W, Z</p>
              </div>
              <div className="bg-pink-100 p-2 rounded border-2 border-pink-400">
                <p className="font-bold text-pink-800">👩 FEMALE VOICES</p>
                <p className="text-xs">A, D, G, J, M, P, S, V, Y</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded border-2 border-yellow-400">
                <p className="font-bold text-yellow-800">👶 KIDS VOICES</p>
                <p className="text-xs">C, F, I, L, O, R, U, X</p>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2 font-bold">
              Available voices: Male({VOICE_CATEGORIES.male.length}) Female({VOICE_CATEGORIES.female.length}) Kids({VOICE_CATEGORIES.kids.length})
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg border-4 border-orange-500">
            <h3 className="text-lg font-bold text-orange-800 mb-2">😡😊😢🤩 EMOTIONAL CHAOS!</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-red-100 p-2 rounded border border-red-300">
                <p className="font-bold text-red-700">😡 ANGRY: gr, rr, gg, ff, xx, zz</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                <p className="font-bold text-yellow-700">😊 HAPPY: ha, he, hi, ho, la, ya</p>
              </div>
              <div className="bg-blue-100 p-2 rounded border border-blue-300">
                <p className="font-bold text-blue-700">😢 SAD: oo, uu, ww, mm, nn, bo</p>
              </div>
              <div className="bg-pink-100 p-2 rounded border border-pink-300">
                <p className="font-bold text-pink-700">🤩 EXCITED: ee, aa, ii, wow, yes</p>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-2 font-bold">
              Type letter combinations to trigger emotional outbursts!
            </p>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4 text-lg font-bold">
            <div className="bg-red-100 p-4 rounded-lg border-4 border-red-500">
              <p className="text-red-700">🚫 Backspace = "NOPE!"</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg border-4 border-blue-500">
              <p className="text-blue-700">🔊 Every letter SCREAMS!</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg border-4 border-green-500">
              <p className="text-green-700">✨ Sparkle explosions!</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg border-4 border-purple-500">
              <p className="text-purple-700">📱 Random vibrations!</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-200 rounded-lg border-4 border-yellow-600">
            <p className="text-yellow-800 font-bold text-xl">
              Click sounds stacked: {clickCount} 🔊
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              (Each letter adds MORE clicking sounds!)
            </p>
          </div>
        </div>

        <div className="bg-red-500 text-white p-6 rounded-lg shadow-2xl border-4 border-white animate-pulse">
          <h3 className="text-2xl font-bold mb-2">⚠️ WARNING ⚠️</h3>
          <p className="text-lg">
            This website serves NO purpose, drains your battery, and will embarrass you in public!
          </p>
          <p className="text-sm mt-2 opacity-75">
            You've been warned. Lettuce continue anyway! 🥬
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes rainbow {
          0% { border-color: #ff0000; }
          16% { border-color: #ff8000; }
          33% { border-color: #ffff00; }
          50% { border-color: #00ff00; }
          66% { border-color: #0080ff; }
          83% { border-color: #8000ff; }
          100% { border-color: #ff0000; }
        }
        
        .border-rainbow {
          animation: rainbow 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
