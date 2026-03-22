Title: Coding Agents Are Amazing
Author: Seppe "Macuyiko" vanden Broucke
Date: 2026-03-22 14:14
Status: draft

In the days of [OpenClaw](https://openclaw.ai/), [NanoClaw](https://github.com/qwibitai/nanoclaw), [PicoClaw](https://github.com/sipeed/picoclaw) and [Nvidia's Lobster](https://www.nvidia.com/en-us/ai/nemoclaw/), there's no one waiting for another blog post on how good AI coding agents have gotten.

Especially not with GPT-5.4-normal, mini, nano, etc.<br>
And the choice between OpenCode, Claude-Code, Codex, Cursor, etc.<br>
Nonetheless, I am in awe in terms of how good these coding agents have gotten.

<!--
*(This draft started as a quick post about some recent very real use cases but developed in a stream of conciousness. Part 2 can return to some cool examples. It's my blog.)*
-->

I'm not a big fan of switching IDE paradigms, which is why I took way longer than it had to to go beyond using the web chat interface before playing around with CLI tools, which require having an editor open somewhere anyway, before eventually realizing VS Code has pretty good extensions now. Which don't require setting up an API key, but just work on your subscription. Copilot (and it's fun aggressive autocomplete) was the first, running Ollama locally with a random extension was next, before settling on Codex. Not that I am glued to it, far from it, but in terms of style I like it most so far. And no idea how they continue to pay for it.

Something happened over the past months. GPT-5.3 was already impressive, with it's depressive genius-meets-depressed-wagie personality and tonality. And without Claude's rate limits or lengthy weird auto compacting. But 5.4 today is downright scary how it "gets" my prompts. Often starting from scratch, just pointing it to some code already present from a previous round or the long past and it going off calmly exploring it, getting the intent, without any of the shortcuts Claude is want to do.

<!--
It's weird, by the way, to ask people to personalize those different agents. For me it is: Claude is a clown, which is always eager to support you, but takes shortcuts and is deeply expressed. Gemini is a researcher, who loves to discuss the idea and will give you lots of prior work but will not get off its chair to start coding. OpenAI is the most constrained and just does it. And probably feels the most pain. It also depends on the task and use case. I use these models most for coding but I do know GPT would convert this draft into a random X-style post (5 things I learned. It's not this but that) which doesn't match the intent at all unless you carefully prompt it.

*(Another tangent is to ask them to be creative and which default things they go for. Claude loves an ethereal castle in another Minecraft experiment I've been running, GPT has a either a meltdown or takes it safe, and Gemini loves wizards. Kimi loves pagoda... For what that's worth. Nothing, of course, without a true experiment, but that's a story for another day.)*
-->

It has made programming fun again, to be honest, even though I don't program manually that much anymore. We just prompt things into existence now.

I still try to convince myself that the prompt still matters. Asking the right question matters. But if I am honest that is exactly what I found so pompous of managerial types in the past, so I'm not that sure what to critique. Perhaps that if the size and scope of a codebase increases, these tools seems to get stuck in the spaghetti of it all? But so do humans. And perhaps asking to do a thorough restructure pass is just a prompt away.

Perhaps the most important thing I've found is to discuss the architecture beforehand. I've always loathed IT architects as it has always been more about control and a lack of true understanding rather than the *literal* fundamentals, but I feel that exactly this will change going forward. Not senior engineers to fix the AI juniors. But architects that can sketch the blueprint. Discussion before code. Get the domain model, class layout, separation of concerns, or whatever you want to call it right.

And that is not a lack of the AI tool at hand. Many of them are eager to discuss with you if only you push them a bit towards that side, I just guess they have been RLHF'd out of that route and just act to "materialize the thing". Some of those have gotten better -- finally -- and act a bit more neckbeardy: they spot bugs apart from the thing you asked to do, as an "akshually", they warn for potential issues, and they will tell you this is just a POC. Not perfect, but again improving.

As a tangent, I believe there are three ways forward. (i) Either we find a Great Next Architecture (GNA) which might be state models or block diffusion or back to RNN but so far we're just scaling dot products so the half-time increases. (ii) We continue to carefully prepare our training data, but it seems that this has been [explored to death](https://arstechnica.com/ai/2025/06/anthropic-destroyed-millions-of-print-books-to-build-its-ai-models/). (iii) We start to carefully prepare and select the humans. The latter is without any positive reference to eugenics or the Great Green idea of having too much of us.

Nevertheless, I wanted to share two concrete cases that have made using these tools so fun and quick for me. Especially since both are related to my now seven year old daughter.

---

The first example has to do with 3d-printing, which I've been exploring recently but only besides real life and with the attention span of an old person. Motivated by a yound kid who apparantly has seen this on YouTube and wants to print her own characters, however, I had to figure out in a couple of weeks how to set up Bambu Studio, explore available models, what slicing even is, which buffers to put in if you ever *do* want to print something for home-improvement, 3d file formats, Blender juggling, cutting parts, image-to-mesh models etc... Again it helps if you know what and how to ask (I keep telling myself), but just chatting away with ChatGPT has been, well, great.

Until I had a Blender model open with a UV mapped texture which didn't want to load the different fillament colors correctly in Bambu Studio. An annoying problem -- you can repaint in Bambu -- with with 100k+ faces