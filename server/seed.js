import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.MONGO_URI) { console.error("Missing MONGO_URI in server/.env"); process.exit(1); }
const userSchema = new mongoose.Schema({ name: String, email: String, password: String, bio: String, createdAt: Date });
const User = mongoose.models.User || mongoose.model("User", userSchema);
const postSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, title: String, slug: {type:String,unique:true}, excerpt:String, content:String, tags:[String], status:String, readTimeMinutes:Number, deleted:Boolean, createdAt:Date, updatedAt:Date, publishedAt:Date });
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
const stories = [
 {title:"A little guide to starting over",slug:"fieldnotes-starting-over",tags:["life","journal","beginnings"],content:`# Begin where you are\n\nStarting over rarely looks like a movie montage. Sometimes it looks like making your bed, opening a window, and deciding to try again on a Tuesday.\n\nYou do not need a brand-new version of yourself. You can bring the lessons, the soft parts, and even the things you are still figuring out.\n\n## A few things to remember\n\n- Small progress is still progress.\n- You are allowed to change your mind.\n- Rest is part of beginning, too.\n\nMaybe the brave thing is not having a plan. Maybe it is simply giving yourself another chance.`},
 {title:"Things worth writing down",slug:"fieldnotes-things-worth-writing-down",tags:["writing","everyday","journal"],content:`# Collect the little things\n\nThe smell of rain on a hot road. A song that finds you at exactly the right time. The stranger who smiled on a difficult morning.\n\nOrdinary days are full of details that disappear unless we give them somewhere to live. A notebook can be a tiny time machine—not because every day is extraordinary, but because every day has something in it.\n\n> Pay attention. Be astonished. Tell about it.\n\nWrite down one small thing from today. That is enough for a beginning.`},
 {title:"Making room for creativity",slug:"fieldnotes-room-for-creativity",tags:["creativity","slow-living","ideas"],content:`# Creativity needs a little breathing room\n\nNot every hobby needs to become a side hustle. Not every sketch needs to be shared. Some things can exist just because they make an afternoon feel more like your own.\n\nTry leaving ten quiet minutes in your day. Put your phone away, gather whatever is nearby, and make something imperfect. A messy page counts. So does a half-finished idea.\n\n## A tiny invitation\n\n- Make a playlist for a feeling.\n- Take a photo of something ordinary.\n- Write three lines without editing them.\n\nYou are allowed to make things without knowing what they will become.`},
 {title:"A note to my future self",slug:"fieldnotes-note-to-future-self",tags:["letters","reflection","journal"],content:`# Dear future me,\n\nI hope you remember how much you wanted the life you are living now. I hope you are still curious, still learning, and still making space for the people and little rituals that make you feel at home.\n\nIf things have not gone to plan, please be gentle with the version of you who got here. We did the best we could with what we knew.\n\nKeep choosing what feels honest. Keep asking questions. Keep a little wonder in your pockets.\n\nWith love,\n\nYour past self ✿`}
];
try {
 await mongoose.connect(process.env.MONGO_URI);
 let user = await User.findOne({email:"hello@fieldnotes.local"});
 if (!user) { user = await User.create({name:"The Fieldnotes Editors",email:"hello@fieldnotes.local",password:"seed-content-no-login",bio:"A tiny collection of starter stories for the Fieldnotes notebook.",createdAt:new Date()}); }
 let added=0;
 for (const story of stories) {
   if (await Post.exists({slug:story.slug})) continue;
   const plain=story.content.replace(/[#>*_`]/g," ").replace(/\s+/g," ").trim();
   const words=story.content.trim().split(/\s+/).length;
   await Post.create({userId:user._id,title:story.title,slug:story.slug,excerpt:plain.length>180?plain.slice(0,177)+"…":plain,content:story.content,tags:story.tags,status:"published",readTimeMinutes:Math.max(1,Math.ceil(words/200)),deleted:false,createdAt:new Date(),updatedAt:new Date(),publishedAt:new Date()});
   added++;
 }
 console.log(`Seed complete. Added ${added} starter stories; existing stories were left untouched.`);
 console.log("Starter content is attributed to The Fieldnotes Editors. No real user account or password was created.");
} catch(error) { console.error("Seed failed:",error.message); process.exitCode=1; }
finally { await mongoose.disconnect(); }
