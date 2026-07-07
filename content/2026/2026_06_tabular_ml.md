Title: Tabular ML: Solved, But (Still) Risky
Author: Seppe "Macuyiko" vanden Broucke
Date: 2026-06-07 14:14
Status: draft

Right before the arrival of the first LLMs, I co-authored [a book on Model Risk](https://www.managingmodelriskbook.com/) from an ML / analytical perspective. Rather than taking a purely financial view on the topic, we wanted to break open the term Model Risk to also cover other typical failure cases that lead to harm down the line. Think of data leakage, incorrect usage of models, or not tuning hyperparameters to not being attuned to the wider organizational needs or culture. It even included some early deep learning aspects such as buggy digital twins and faulty reward functions.

At some point there was an opportunity to write a second edition to also cover all the hot new AI aspects going on, but which did not happen in the end. One of the reasons being that the field evolves so fast now that it's hard to cover it with a static book and that book publishing itself has become a source of risk itself due to AI slop.

Anyway, my latent feeling nowadays arrived at the notion that tabular learning is more or less solved. We all know how to set up the pipelines, throw XGBoost or your favorite booster on top of it (or TabPFN/Net/FM if you want to be extra fancy) and be done of it. No one would dare to make those old fashioned mistakes anymore today, especially when it's Claude doing the coding, right?

In an "Advanced Analytics" course I've been teaching since 2017 (oof), we (meaning me and every year's new cohort of students) have been going through a similar flow. From explaining new ML models (Random Forest, not just SVMs) to the importance of thinking of validation, production, generalization (test set, not goodness of fit), to talking about MLops, from Big Data and Hadoop to just use Snowflake, to the arrival of LLMs and ultimately accepting that tabular learning is solved and perhaps even all of ML is solved once AI becomes good enough it can just do 99% of the work we did manually before anyways; it's been a wild ride.

A while ago, I came across the following article: [Post-Quantum TLS and Wire-Level Fingerprints Broke the Basic Scraper](Post-Quantum TLS and Wire-Level Fingerprints Broke the Basic Scraper). It's at the intersection of two things I like: scraping, and ML. The article mainly leverages an arxiv paper to show that your simple ways of scraping are easy to spot and hence you should buy our product. Fun observation number one is that the article was clearly written by AI:

> This is the part most bot detection tutorials skip. Most posts on anti-bot evasion still revolve around User-Agent rotation, cookies, and CAPTCHAs. Those are the easy layers. But the connection layer is the one you can't bluff with a header.

But ok, I don't want to blame them on this, we all use AI nowadays to write similar slop. I'm not sure whether it actively improves engagement or sales, but on the other hand I am deeply aware of the AI writing-isms and perhaps there is still an untapped or unaware audience for this. Doesn't matter. Don't worry I am getting to the point.

The paper itself, ["When Handshakes Tell the Truth: Detecting Web Bad Bots via TLS Fingerprints"](https://arxiv.org/html/2602.09606v1) shows incredible results:

- Uses TLS fingerprint signals (JA4DB) to predict whether a website visitor is a bot or benign
- Labeling is a bit weak based on the user agent self-reporting it's a bot, but fair
- Features include OS, app, a unique TLS cipher fingerprint, etc
- 99%+ ROC AUC with XGBoost or Catboost
- Train/test split randomly done

This figure from the paper makes it more or less clear which features where used:

![](https://arxiv.org/html/2602.09606v1/JA4.png)

With these being the most important ones:

![](https://arxiv.org/html/2602.09606v1/XGBoostFeatureImportance.png)

Hm. 99%+ ROC AUC is certainly spectacular. Or as the original celebratory blog post put it:

> 98.6%. That's the classification accuracy a CatBoost model hit using only connection-level features. No headers. No IPs. No behavior. Just the shape of the initial handshake.

Thanks Claude... that's not just unbelievable, but also amazing. It's unfair to expect it, but I still find it appalling how little LLMs push back on the initial task and apparantly didn't go "Wow, wait a second, I'm not sure whether I'd use this paper. Seems to good to be true." But even with a more-open ended prompt, it might take some time. These are all the questions I went through with a fresh GPT 5.5 session after having given it the paper:

> I want to ask questions about this paper
> **Reply:** It’s “When Handshakes Tell the Truth: Detecting Web Bad Bots via TLS Fingerprints”, about using JA4 TLS fingerprints plus XGBoost/CatBoost to distinguish malicious bots from benign/human traffic. The paper reports very high test performance, with CatBoost slightly ahead: AUC 0.998, F1 0.9734, accuracy 0.9863. Ask me anything about it: summary, methodology, critique, assumptions, threat model, results, weaknesses, or how convincing the ML setup is.
> the most important feature is which one? 
> **Reply:** (more blabbering)
> ja4_b -- what is this exactly? (me trying to help it)
> **Reply:** ja4_b is the “middle” part of a JA4 TLS client fingerprint: a hash of the client’s offered cipher suites.
> And the way how the train test split is done is 80/20 ?
> **Reply:** Yes. The paper says the data was split into 80% training and 20% test, using a fixed random seed for consistency. (more blabbering) One important critique: the paper does not clearly say whether the split was done in a way that prevents the same or near-identical ja4_b / JA4 fingerprints from appearing in both train and test. If identical fingerprint categories occur in both sets, the model may partly be learning a lookup table of known fingerprints rather than generalizing to unseen bots.

Ah look, finally it gets the issue, but we had to push sufficiently long. Ok, let's see if we can reproduce and prove that this is an issue. That part goes very fast with an LLM, in fact. So comparing four setups:

1. **Random 80/20 split, all JA4 features**: closest to the paper-style setup.
2. **Random 80/20 split, no hash features**: removes `ja4_b` and `ja4_c` to test whether the hash categories drive performance.
3. **Group split by `ja4_b + ja4_c`, all JA4 features**: prevents the two main hash components from being reused across train and test.
4. **Group split by full JA4, all JA4 features**: prevents exact full-fingerprint reuse across train and test.

