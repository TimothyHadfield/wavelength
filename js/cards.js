// Built-in spectrum cards. Every pair here was written for this site (family-friendly, not copied from
// any published deck). Format: "Left|Right". test/cards.test.mjs checks the count, duplicates and format.
// Classic script: sets globalThis.WL_LISTS (also importable from node for tests).
(function (root) {
const L = (name, s) => ({ name, builtin: true, cards: s.trim().split('\n').map(x => { const [left, right] = x.trim().split('|'); return { left, right }; }) });

root.WL_LISTS = [
L('Basic', `
Hot|Cold
Soft|Hard
Light|Heavy
Fast|Slow
Loud|Quiet
Smooth|Rough
Wet|Dry
Big|Small
Round|Pointy
Bright|Dim
Sweet|Sour
Spicy|Mild
Healthy|Unhealthy
Gourmet|Fast Food
Undercooked|Overcooked
Tasty|Disgusting
Happy|Sad
Brave|Cowardly
Calm|Anxious
Optimistic|Pessimistic
Introverted|Extroverted
Serious|Silly
Romantic|Unromantic
Generous|Stingy
Patient|Impatient
Honest|Deceptive
Overrated|Underrated
Mainstream|Niche
Old-Fashioned|Modern
Formal|Casual
Urban|Rural
Luxury|Budget
Famous|Unknown
Classy|Tacky
Trendy|Timeless
Good|Evil
Legal|Illegal
Ethical|Unethical
Selfish|Selfless
Forgivable|Unforgivable
Role Model|Bad Influence
Beautiful|Ugly
Colorful|Dull
Simple|Complex
Futuristic|Retro
Elegant|Messy
Safe|Dangerous
Easy|Difficult
Boring|Exciting
Relaxing|Stressful
Rewarding|Pointless
Ancient|Recent
Rare|Common
Natural|Artificial
Permanent|Temporary
Predictable|Surprising
Weird|Normal
Smells Good|Smells Bad
Useful|Useless
Cheap|Expensive
Necessary|Unnecessary
Trustworthy|Suspicious
Cute|Scary
Addictive|Forgettable
Genius|Foolish
Guilty Pleasure|Openly Love
Skill|Luck
Needs Salt|Too Salty
Looks Easy|Looks Hard
Overpriced|A Bargain
Best Alone|Best With Others
`),

L('Food & Drink', `
Breakfast Food|Dinner Food
Crunchy|Mushy
Kid Food|Grown-Up Food
Finger Food|Needs a Fork
Snack|Full Meal
Comfort Food|Fancy Food
Eat It Hot|Eat It Cold
Sticky|Crumbly
Home Cooking|Restaurant Only
Bland|Bursting With Flavor
Ruins Your Breath|Freshens Your Breath
Pizza Topping Yes|Pizza Topping No
Good Leftovers|Bad Leftovers
Picnic Food|Stay-Indoors Food
Easy to Share|Hard to Share
Lunchbox Hero|Lunchbox Shame
Messy to Eat|Tidy to Eat
Healthy-Sounding|Actually Healthy
Party Drink|Bedtime Drink
Fruit|Vegetable
Dessert|Not a Dessert
Bakery|Grocery Aisle
Grandma's Recipe|Microwave Meal
Smells Better Than It Tastes|Tastes Better Than It Smells
Sandwich|Not a Sandwich
Soup|Not Soup
Dip It|Never Dip It
Camping Food|Wedding Food
Takes Seconds to Make|Takes All Day to Make
Salty Snack|Sweet Snack
Movie Snack|Road Trip Snack
Acquired Taste|Everyone Loves It
Chewy|Melts in Your Mouth
Holiday Food|Any-Day Food
Better Frozen|Better Fresh
Eat With Hands|Eat With Chopsticks
Fills You Up|Leaves You Hungry
Crispy|Soggy
Lukewarm Is Fine|Must Be Piping Hot
Picky Eater Approved|Picky Eater Nightmare
`),

L('Around the House', `
Kitchen|Garage
Useful Gadget|Junk Drawer
Clean|Dirty
Cozy|Cold and Sterile
Fragile|Indestructible
Easy to Lose|Impossible to Lose
Plug It In|Runs on Batteries
Chore|Treat
Indoor Thing|Outdoor Thing
Heavy to Move|Light to Move
Keep Forever|Throw Out Today
Hand-Me-Down|Brand New
Noisy Appliance|Silent Appliance
Morning Routine|Bedtime Routine
Belongs in a Drawer|Belongs on a Shelf
Smells Like Home|Smells Like a Hospital
Easy to Fix|Call a Professional
Tidy Room|Disaster Zone
Fancy Furniture|Dorm Furniture
Gift Wrap Worthy|Grocery Bag Worthy
Warm Blanket|Scratchy Blanket
Gets Lost in the Couch|Never Leaves the Shelf
Weekend Project|Lifetime Project
Bathroom Item|Bedroom Item
Lasts a Day|Lasts a Lifetime
Shared by the Family|Strictly Personal
Easy to Clean|Impossible to Clean
Paper|Plastic
Holiday Decoration|Everyday Decoration
Dangerous for Toddlers|Safe for Toddlers
Fits in a Pocket|Fills a Room
Spring Cleaning Victim|Spring Cleaning Survivor
Squeaky|Silent
Old Technology|New Technology
Opened Daily|Opened Once a Year
Annoying Sound|Soothing Sound
Mess Maker|Mess Cleaner
Garage Sale Find|Museum Piece
Needs Instructions|Totally Obvious
Snooze Button|Jump Out of Bed
`),

L('People & Jobs', `
Hero|Sidekick
Leader|Follower
Morning Person|Night Owl
Quiet Job|Loud Job
Dream Job|Nightmare Job
Indoor Job|Outdoor Job
Needs a Uniform|Wear Anything
Famous Job|Invisible Job
Hard to Become|Anyone Can Do It
Kids Want to Be|Adults Want to Be
Dangerous Job|Desk Job
Planner|Spontaneous
Neat Freak|Total Slob
Early Bird|Always Late
Good Listener|Good Talker
Team Player|Lone Wolf
Fancy Title|Humble Title
Would Make a Good Parent|Would Make a Bad Parent
Life of the Party|Leaves the Party Early
Bossy|Pushover
Trendsetter|Late Adopter
Tech Wizard|Tech Disaster
Great Neighbor|Terrible Neighbor
Rule Follower|Rule Breaker
Saves Money|Spends Money
Superhero Power|Useless Power
Teacher's Pet|Class Clown
Good in a Crisis|Panics Instantly
Born Leader|Reluctant Leader
Needs a Map|Never Gets Lost
Remembers Birthdays|Forgets Birthdays
Movie Villain|Movie Hero
Grandparent Approved|Grandparent Confused
Hard Worker|Hardly Working
Gift Giver|Gift Receiver
Loyal|Fickle
Overthinker|Underthinker
Old Soul|Young at Heart
Mysterious|Open Book
Good Advice|Bad Advice
`),

L('Feelings & Moods', `
Relieved|Worried
Proud|Embarrassed
Grateful|Annoyed
Lonely|Surrounded
Bored Stiff|On the Edge of Your Seat
Cringe|Wholesome
Heartwarming|Heartbreaking
Awkward|Smooth
Nervous|Confident
Bittersweet|Purely Sweet
Mildly Annoying|Deeply Infuriating
Nostalgic|Brand New Feeling
Peaceful|Chaotic
Energized|Exhausted
Sleepy|Wide Awake
Satisfying|Frustrating
Jealous|Content
Hopeful|Hopeless
Surprised|Saw It Coming
Silly Fear|Serious Fear
Small Win|Huge Win
Small Disappointment|Crushing Disappointment
Laugh Out Loud|Polite Chuckle
Tear-Jerker|Feel-Good
Motivating|Discouraging
Calm Before the Storm|Storm
Butterflies|Dread
Monday Feeling|Friday Feeling
Overwhelmed|In Control
Inspired|Uninspired
Childish Joy|Grown-Up Joy
Comforting|Unsettling
Easy to Forgive|Hold a Grudge
Rainy Day Mood|Sunny Day Mood
Fresh Start|Old Habit
Love at First Sight|Grows on You
Tense|Relaxed
Gentle|Fierce
Victory Dance|Quiet Fist Pump
Slight Itch|Unbearable Itch
`),

L('Places & Travel', `
Tourist Trap|Hidden Gem
Beach|Mountains
City Break|Countryside Escape
Road Trip|Plane Trip
Window Seat|Aisle Seat
Overpacked|Underpacked
Bucket List|Never Again
Day Trip|Two-Week Vacation
Camping|Five-Star Hotel
Close to Home|Other Side of the World
Crowded|Deserted
Quiet Town|Busy City
Theme Park|Museum
Worth the Line|Not Worth the Line
Postcard Pretty|Ugly but Fun
Sunny|Gloomy
Lost|Found the Way
Short Walk|Long Hike
Fancy Restaurant|Roadside Diner
Planned Trip|Last-Minute Trip
Souvenir Treasure|Souvenir Junk
Airport Fun|Airport Misery
Family Vacation|Solo Adventure
Fun Commute|Awful Commute
Safe Neighborhood|Sketchy Neighborhood
Old Building|New Building
Hot Destination|Cold Destination
Easy to Pronounce|Hard to Pronounce
Small Island|Huge Country
Underground|Up in the Sky
Lazy Holiday|Action Holiday
Cheap Trip|Splurge Trip
Great Weather|Terrible Weather
Visit Once|Visit Every Year
Swimming Pool|Ocean
Friendly Locals|Grumpy Locals
Train Ride|Bus Ride
Famous Landmark|Forgotten Landmark
Walkable|Need a Car
Feels Like Home|Feels Like Another Planet
`),

L('Movies, Music & Games', `
Blockbuster|Indie Film
Kids Movie|Adults Movie
Sequel Better|Original Better
Plot Twist|Totally Predictable
Book Better|Movie Better
Movie Villain You Love|Movie Villain You Hate
Background Music|Dance Floor Anthem
Sing Along|Just Listen
Board Game|Video Game
Party Game|Strategy Game
Easy to Learn|Hard to Master
Cartoon|Live Action
Comedy|Drama
Scary Movie|Cozy Movie
Rewatchable|Watch Once
Catchy Song|Forgettable Song
Wedding Song|Breakup Song
Workout Music|Study Music
One-Hit Wonder|Legend
Spoiler|Fair to Mention
Binge-Worthy|Watch Weekly
Theater Experience|Couch Experience
Classic|Fad
Superhero|Supervillain
Happy Ending|Sad Ending
Movie Snack Worth It|Movie Snack Ripoff
Character You'd Befriend|Character You'd Avoid
Overacted|Underacted
Childhood Favorite|Aged Badly
Holiday Movie|Summer Movie
Card Game|Dice Game
Sore Loser|Good Sport
Cheat Code|Fair Play
Arcade|Console
Background TV|Must Watch
Hidden Talent|Famous Talent
Silent Film|Musical
Short Song|Epic Song
Opening Act|Headliner
Game Night Winner|Game Night Ruiner
`),

L('Animals & Nature', `
Pet|Wild Animal
Cuddly|Prickly
Land Animal|Sea Animal
Tiny Creature|Giant Creature
Harmless|Deadly
Lazy Animal|Busy Animal
Cat Person|Dog Person
Easy Pet|Hard Pet
Pretty Bug|Creepy Bug
Day Animal|Night Animal
Good Mascot|Bad Mascot
Loud Animal|Silent Animal
Clever Animal|Clueless Animal
Fluffy|Scaly
Farm Animal|Zoo Animal
Flower|Weed
Gentle Breeze|Hurricane
Desert|Rainforest
Summer|Winter
Sunrise|Sunset
Pond|Ocean
Pebble|Boulder
Short Life|Long Life
Graceful|Clumsy
Common Bird|Rare Bird
Smells Nice Outdoors|Smells Awful Outdoors
Seasonal|All Year Round
Fast Swimmer|Slow Swimmer
Garden Friend|Garden Pest
Tropical|Arctic
Underrated Animal|Overrated Animal
Would Win a Fight|Would Lose a Fight
Calming Sound of Nature|Alarming Sound of Nature
Grows Fast|Grows Slow
Edible Plant|Poisonous Plant
Cute Baby Animal|Awkward Baby Animal
Herbivore|Carnivore
Solitary|Herd Animal
Stormy|Clear Sky
Mild Weather|Extreme Weather
`),

L('School & Work', `
Favorite Subject|Least Favorite Subject
Useful in Real Life|Only Useful in School
Group Project|Solo Project
Easy Test|Impossible Test
Quick Homework|All-Night Homework
Recess|Detention
Fun Field Trip|Boring Field Trip
Good Excuse|Bad Excuse
Meeting|Could Have Been an Email
Productive Day|Wasted Day
Office Perk|Office Annoyance
Raise Your Hand|Stay Silent
Front Row|Back Row
Cramming|Studying Early
Online Class|In-Person Class
Good Boss|Bad Boss
Work From Home|Work From the Office
First Day Nerves|Last Day Relief
Lunch Break|Coffee Break
Smart Idea|Silly Idea
Learn in a Day|Learn in a Lifetime
School Supply Essential|School Supply Extra
Easy Grade|Hard Earned Grade
Popular Club|Unpopular Club
Short Deadline|Long Deadline
Science|Art
Math Lover|Math Hater
Gold Star|Red Ink
Library Quiet|Cafeteria Loud
Good Teacher Trait|Bad Teacher Trait
Interview Answer|Never Say in an Interview
Overtime|Day Off
Promotion|Demotion
Spreadsheet|Sketchbook
Handwritten|Typed
Pop Quiz|Final Exam
Summer Break|First Week Back
Hard Work|Natural Talent
Career|Hobby
Brainstorm|Brain Freeze
`),

L('Big Questions', `
Fair|Unfair
Worth the Price|Not Worth the Price
Nature|Nurture
Overhyped|Underhyped
Free Will|Fate
Matters in 100 Years|Forgotten Tomorrow
Good Invention|Bad Invention
Simple Pleasure|Complicated Pleasure
Brave Choice|Reckless Choice
Wise|Naive
Fact|Opinion
Science Fact|Science Fiction
Rich in Money|Rich in Time
Small Lie|Big Lie
Tradition|Innovation
Better Together|Better Apart
Lucky Break|Earned It
Worth Waiting For|Not Worth Waiting For
Should Be Free|Should Cost a Lot
Overcomplicated|Oversimplified
Short-Term Fun|Long-Term Happiness
Easy to Explain|Hard to Explain
Ahead of Its Time|Behind the Times
Human|Robot
Fixable|Unfixable
Real|Imaginary
Polite|Rude
Normal at Home|Weird in Public
Universal|Personal Taste
Strong Opinion|No Opinion
Worth Arguing About|Not Worth Arguing About
Clever|Wise
Good Secret|Bad Secret
Changed the World|Changed Nothing
Old Wisdom|New Wisdom
Proud to Admit|Embarrassed to Admit
Small Step|Giant Leap
Destiny|Coincidence
Above Average|Below Average
Lasting Legacy|Quickly Forgotten
`),

L('Just Silly', `
Makes a Good Hat|Makes a Bad Hat
Would Survive a Zombie Movie|First to Go
Good Superhero Name|Bad Superhero Name
Pirate Approved|Pirate Rejected
Fits in a Backpack|Needs a Truck
Fun to Say|Boring to Say
Wizard Spell|Grocery List
Haunted|Not Haunted
Dragon Treasure|Dragon Trash
Fancy Name for a Cat|Normal Name for a Cat
Good Pillow|Terrible Pillow
Robot Uprising Leader|Robot Uprising Victim
Bounces|Splats
Royal|Peasant
Alien Would Love It|Alien Would Hate It
Good Band Name|Bad Band Name
Fun Costume|Awkward Costume
Sneaky|Obvious
Wobbly|Sturdy
Tickles|Hurts
Ninja|Clown
Space Food|Earth Food
Would Make a Good Pet Rock|Would Make a Bad Pet Rock
Bedtime Story|Campfire Story
Good Sound Effect|Bad Sound Effect
Squishy|Crunchy Underfoot
Medieval|Modern Day
Lucky Charm|Bad Omen
Fancy Dance Move|Embarrassing Dance Move
Treasure Map|Takeout Menu
Superpower Side Effect: Mild|Superpower Side Effect: Terrible
Would Fit in a Fairy Tale|Would Ruin a Fairy Tale
Toothbrush Mustache|Majestic Beard
Snowman Accessory|Sandcastle Accessory
Unicorn|Goblin
Fun to Pop|Fun to Squish
Time Travel Souvenir|Time Travel Mistake
Moon Base Essential|Moon Base Luxury
Sock Puppet|Marionette
Wise Old Owl|Silly Goose
`),
];
})(typeof window !== 'undefined' ? window : globalThis);
