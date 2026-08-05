Title: Tabular ML: Solved, But Still Risky
Author: Seppe "Macuyiko" vanden Broucke
Date: 2026-08-04 14:14

Right before the arrival of the first LLMs, I co-authored [a book on Model Risk](https://www.managingmodelriskbook.com/) from a machine learning perspective. Rather than taking a (purely) financial view on the topic, we wanted to break open the term Model Risk to cover all predictive modelling failure cases that lead to harm down the line. The book covered problems such as data leakage and incorrect model use, failures caused by ignoring the wider organizational needs or culture and even included some early deep learning aspects such as buggy digital twins and faulty reward functions. At some point there was an opportunity to write a second edition to cover all the hot new AI aspects going on, but that did not happen in the end. One of the reasons was that the field now evolves so fast that it is hard to cover with a static book. Book publishing itself has become a source of risk due to "AI slop" (I'm a heavy user of AI tools myself, but the slop has been a negative).

Anyway, my latent feeling nowadays has settled on the notion that tabular learning is more or less solved. We all know how to set up the pipelines, throw XGBoost or your favorite booster on top of it (or TabPFN/Net/FM if you want to be extra fancy) and be done with it. No one would dare to make those old-fashioned mistakes anymore today, especially when it's Claude doing the coding, right?

In an "Advanced Analytics" course I've been teaching since 2017 (oof), we (meaning me and each year's new cohort of students) have been going through a similar flow. From explaining new ML models (Random Forest after starting from SVMs) to the importance of thinking about validation and generalization (test set, not goodness of fit), to talking about production and MLOps, from Big Data and Hadoop to just using Snowflake, to the arrival of LLMs and ultimately accepting that tabular learning is solved and perhaps even all of ML is solved once AI becomes good enough that it can just do 99% of the work we did manually before anyway. It's been a wild ride.

A while ago, I came across the following article: [Post-Quantum TLS and Wire-Level Fingerprints Broke the Basic Scraper](https://scrapfly.io/blog/posts/post-quantum-tls-bot-detection). It's at the intersection of two things I like: scraping and ML. The article mainly leverages an arXiv paper to show that your simple ways of scraping are easy to spot and hence you should buy our product. Fun observation number one is that the article was clearly written by AI:

> This is the part most bot detection tutorials skip. Most posts on anti-bot evasion still revolve around User-Agent rotation, cookies, and CAPTCHAs. Those are the easy layers. But the connection layer is the one you can't bluff with a header.

I don't want to be too critical here. We all use AI nowadays. I'm not sure whether it actively improves engagement or sales, but perhaps there is still an untapped or unaware audience for which the AI writing style works.

The paper they refer to, ["When Handshakes Tell the Truth: Detecting Web Bad Bots via TLS Fingerprints"](https://arxiv.org/html/2602.09606v1) shows incredible results:

- Uses TLS fingerprint signals (JA4DB) to predict whether a website visitor is a bot or benign
- Labeling is a bit weak based on the user agent self-reporting it's a bot, but that's fair
- Features include OS, app, a unique TLS cipher fingerprint, etc.
- 99%+ ROC AUC with XGBoost or CatBoost
- Random train/test split

This figure from the paper makes it more or less clear which features were used:

![](https://arxiv.org/html/2602.09606v1/JA4.png)

With these being the most important ones:

![](https://arxiv.org/html/2602.09606v1/XGBoostFeatureImportance.png)

99%+ ROC AUC is certainly spectacular. Or as the celebratory blog post put it:

> 98.6%. That's the classification accuracy a CatBoost model hit using only connection-level features. No headers. No IPs. No behavior. Just the shape of the initial handshake.

Thanks Claude (or GPT, or...). It's unfair to expect it, but I still find it appalling how little LLMs push back and apparently don't go "Wow, wait a second, I'm not sure whether I'd use this paper. Seems too good to be true." Even with a more open-ended prompt, it might take some time. These are all the questions I went through with a fresh GPT 5.5 session after having given it the paper:

> I want to ask questions about this paper
> **Reply:** It’s “When Handshakes Tell the Truth: Detecting Web Bad Bots via TLS Fingerprints”, about using JA4 TLS fingerprints plus XGBoost/CatBoost to distinguish malicious bots from benign/human traffic. The paper reports very high test performance, with CatBoost slightly ahead: AUC 0.998, F1 0.9734, accuracy 0.9863. Ask me anything about it: summary, methodology, critique, assumptions, threat model, results, weaknesses, or how convincing the ML setup is.
> the most important feature is which one? 
> **Reply:** (more blabbering)
> ja4_b -- what is this exactly? (me trying to help it)
> **Reply:** ja4_b is the “middle” part of a JA4 TLS client fingerprint: a hash of the client’s offered cipher suites.
> And the way the train/test split is done is 80/20?
> **Reply:** Yes. The paper says the data was split into 80% training and 20% test, using a fixed random seed for consistency. (more blabbering) One important critique: the paper does not clearly say whether the split was done in a way that prevents the same or near-identical ja4_b / JA4 fingerprints from appearing in both train and test. If identical fingerprint categories occur in both sets, the model may partly be learning a lookup table of known fingerprints rather than generalizing to unseen bots.

Ah, finally it gets the issue, but we had to push sufficiently long. Ok, let's see if we can reproduce and show that this is an issue. At least that part does go very fast with an LLM.

The original JA4DB download endpoint (`https://ja4db.com/api/download/`) has disappeared, but I was able to fetch the original JSON dump in time and have [placed it here](https://e.pcloud.link/publink/show?code=XZv3Jy7ZtONXp1mK4nktV9FXuHHEAYmXr6AX). It contains 195,622 records, almost all of which have a usable JA4 fingerprint. I reconstructed the label from the application and user-agent text, following the general idea in the paper, and removed user agents matching known good bots. The resulting data contains 141,954 rows and 28,130 bad-bot labels, a positive rate of 19.8%. Note that the labeling rules are my own reconstruction of what the paper describes, and I deliberately restricted the model features to information parsed from JA4. The absolute scores should therefore not be compared too literally with those in the paper. The behavior under different train/test splits is the part I care about.

I started with a random row split, similar to what the paper does. I then grouped rows on the full JA4 fingerprint so that one fingerprint could only occur on one side of the train/test divide. A stricter version groups on the combined `ja4_b + ja4_c` hash pair. I ran every split with all JA4 fields and then without the two hash fields. The latter still gets the protocol fields and the counts encoded in the first part of JA4.

The result is as follows. All threshold-dependent metrics use the default probability threshold of 0.5. Model used is just CatBoost with default hyperparams, no tuning.

| Split | Features | Test bot rate | ROC AUC | F1 | Precision | Recall | Accuracy |
|---|---|---:|---:|---:|---:|---:|---:|
| Random rows | All JA4 | 19.8% | 0.986 | 0.890 | 0.930 | 0.853 | 0.958 |
| Random rows | No hashes | 19.8% | 0.978 | 0.860 | 0.881 | 0.841 | 0.946 |
| Group by full JA4 | All JA4 | 14.0% | 0.676 | 0.185 | 0.912 | 0.103 | 0.873 |
| Group by full JA4 | No hashes | 14.0% | 0.811 | 0.226 | 0.400 | 0.158 | 0.849 |
| Group by `ja4_b + ja4_c` | All JA4 | 3.4% | 0.730 | 0.074 | 0.403 | 0.041 | 0.966 |
| Group by `ja4_b + ja4_c` | No hashes | 3.4% | 0.591 | 0.179 | 0.170 | 0.188 | 0.942 |

The random split's 0.986 AUC gets close to the paper's reported 0.998. However, the overlap diagnostic makes this less impressive. Of the unique JA4 fingerprints in the random test set, 90.3% (!) also occur in training. **Because the common fingerprints contain many rows, 99.7% of all test rows have a full JA4 value that the model has already seen.**

The 141,954 modeled rows contain only 1,131 distinct full fingerprints. The most common fingerprint accounts for 11.5% of the data. The ten largest account for 46.8%. There are 140 fingerprints associated with both labels, and these mixed-label fingerprints cover 66.3% of all rows. Since rows with the same full JA4 have identical model features, the model cannot separate them. What it can learn under a random split is the historical bot rate associated with a familiar TLS configuration.

Once full fingerprints are kept on one side of the split, AUC drops from 0.986 to 0.676! Grouping on the hash pair gives an AUC of 0.730. That's some signal, but it is a different result from a random row split where almost every test row belongs to a known fingerprint family.

Removing `ja4_b` and `ja4_c` does surprisingly little under the random split: AUC moves from 0.986 to 0.978. Direct memorization of those two hashes is therefore only part of the story. The coarse fields carry a lot of client-family information themselves. In fact, a dumb model using `cipher_count` only reaches an AUC of 0.903 on a random split! Bad-bot rows have an average cipher count of 22.0, compared with 17.9 for benign rows. The relationship also has strong local buckets. A cipher count of 30 occurs 16,410 times and has a bad-bot rate of 70.9%; a cipher count of 9 occurs 7,041 times and is 97.5% bad-bot. This might be a true stable signal. Perhaps bots use particular installations or package versions and so forth that cause this exact cipher count.

But here too, the grouped splits tell a different story. Under the strictest split (grouping on `ja4_b + ja4_c`), the no-hash model falls to an AUC of 0.591, barely above chance. So on unseen hash-pair families, the coarse JA4 fields by themselves carry almost no transferable signal, and a simple monotonic rule on `cipher_count` is weak as well (AUC 0.61 for "high cipher count means bot"). The strong cipher-count buckets learned under a random split are largely properties of fingerprint families that are already represented in training.

In any case, whilst TLS fingerprints do contain useful information about the labels in this database, what the random split measures is largely performance on more observations from fingerprint families that were already represented in training. It provides weak evidence for how the model will generalize to new client families or approaches. Which is exactly bound to appear in scenarios where you present your work to catch "bad bots".

Hence that would be the true generalization question an anti-bot model has to answer. So the old question of what exactly is allowed to appear on both sides of the train/test split is still important, no? Tabular ML may be solved, but we should still be careful not to use it wrongly.
