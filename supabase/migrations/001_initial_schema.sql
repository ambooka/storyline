-- Storyline 3.0 Database Schema
-- Run this in Supabase SQL Editor

-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  reader_class TEXT, -- 'fiction_fanatic', 'non_fiction_navigator', etc.
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  
  -- Settings
  preferences JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ BOOKS ============
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  
  -- Metadata
  total_pages INTEGER,
  genres TEXT[],
  language TEXT DEFAULT 'en',
  
  -- Progress
  current_cfi TEXT,
  current_page INTEGER DEFAULT 0,
  progress DECIMAL DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'reading',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ READING SESSIONS ============
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  pages_read INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ HIGHLIGHTS ============
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  
  cfi TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT,
  color TEXT DEFAULT 'yellow',
  
  is_public BOOLEAN DEFAULT false,
  reaction_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ REACTIONS ============
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  highlight_id UUID REFERENCES public.highlights(id) ON DELETE CASCADE,
  
  cfi TEXT NOT NULL,
  emoji TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, cfi, emoji)
);

-- ============ READING ROOMS ============
CREATE TABLE IF NOT EXISTS public.reading_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id),
  
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE,
  max_participants INTEGER DEFAULT 50,
  
  sync_mode BOOLEAN DEFAULT false,
  current_cfi TEXT,
  
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ROOM PARTICIPANTS ============
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.reading_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  current_cfi TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  UNIQUE(room_id, user_id)
);

-- ============ BADGES ============
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  conditions JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ USER BADGES ============
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

-- ============ BOOK CLUBS ============
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_private BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE,
  
  current_book_id UUID REFERENCES public.books(id),
  reading_schedule JSONB,
  
  member_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CLUB MEMBERS ============
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(club_id, user_id)
);

-- ============ AI SUMMARIES ============
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id TEXT NOT NULL,
  
  chapter_number INTEGER,
  summary TEXT NOT NULL,
  key_points JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_books_user ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_book ON public.highlights(book_id);
CREATE INDEX IF NOT EXISTS idx_reactions_book ON public.reactions(book_id);
CREATE INDEX IF NOT EXISTS idx_room_participants ON public.room_participants(room_id);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Books: Users can only access their own books
CREATE POLICY "Users can CRUD own books" ON public.books
  FOR ALL USING (auth.uid() = user_id);

-- Highlights: Users can see public or own highlights
CREATE POLICY "Users can see public or own highlights" ON public.highlights
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can CRUD own highlights" ON public.highlights
  FOR ALL USING (auth.uid() = user_id);

-- Reading Rooms: Public rooms visible to all
CREATE POLICY "Public rooms visible to all" ON public.reading_rooms
  FOR SELECT USING (is_private = false OR host_id = auth.uid());

CREATE POLICY "Users can create rooms" ON public.reading_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Reading Sessions
CREATE POLICY "Users can CRUD own sessions" ON public.reading_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============ SEED BADGES ============
INSERT INTO public.badges (name, description, icon, xp_reward, conditions) VALUES
('First Blood', 'Finish your first book', '📖', 10, '{"books_finished": 1}'),
('Bookworm', 'Finish 10 books', '🐛', 50, '{"books_finished": 10}'),
('On Fire', '7-day reading streak', '🔥', 25, '{"streak_days": 7}'),
('Night Owl', 'Read 10 hours after midnight', '🌙', 50, '{"night_hours": 10}'),
('Speed Demon', 'Finish a book in one sitting', '⚡', 75, '{"one_sitting": true}'),
('Social Butterfly', 'Join 10 reading rooms', '🦋', 30, '{"rooms_joined": 10}'),
('Highlighter Pro', 'Create 100 highlights', '✨', 40, '{"highlights": 100}'),
('Streak Master', '30-day reading streak', '🏆', 100, '{"streak_days": 30}'),
('Genre Explorer', 'Read from 5 different genres', '🗺️', 50, '{"genres": 5}'),
('Collector', 'Build a library of 50 books', '💎', 75, '{"library_size": 50}')
ON CONFLICT (name) DO NOTHING;

-- ============ FUNCTIONS ============
-- Function to add XP and check level up
CREATE OR REPLACE FUNCTION public.add_xp(user_uuid UUID, xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  SELECT xp, level INTO current_xp, current_level FROM public.profiles WHERE id = user_uuid;
  new_xp := current_xp + xp_amount;
  -- Level formula: level = floor(sqrt(xp / 100)) + 1
  new_level := FLOOR(SQRT(new_xp / 100.0)) + 1;
  
  UPDATE public.profiles 
  SET xp = new_xp, level = new_level, updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_streak(user_uuid UUID)
RETURNS void AS $$
DECLARE
  last_read TIMESTAMPTZ;
  curr_streak INTEGER;
  long_streak INTEGER;
BEGIN
  SELECT last_read_at, current_streak, longest_streak 
  INTO last_read, curr_streak, long_streak 
  FROM public.profiles WHERE id = user_uuid;
  
  IF last_read IS NULL OR (NOW() - last_read) > INTERVAL '48 hours' THEN
    curr_streak := 1;
  ELSIF (NOW() - last_read) > INTERVAL '24 hours' THEN
    curr_streak := curr_streak + 1;
  END IF;
  
  IF curr_streak > long_streak THEN
    long_streak := curr_streak;
  END IF;
  
  UPDATE public.profiles 
  SET current_streak = curr_streak, 
      longest_streak = long_streak, 
      last_read_at = NOW(),
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
