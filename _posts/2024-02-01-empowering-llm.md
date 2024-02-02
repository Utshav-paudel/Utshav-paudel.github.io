---
layout: post
title: Empowering LLm to follow complex instructions
date: 2024-02-02 21:01:00
description: a quick summary of my learning from research paper Empowering LLm to follow complex instructions.
tags: llm
categories: LLMs
---

Lets get dive into research paper named **WizardLM: Empowering Large Language Models to Follow Complex Instructions** where we will get to know about evol instructions. Before Its lets start with why evol instructions comes

#### Problems on closed domain instructions
* Training LLM on closed domain instructions i.e specific type of instructions resulted in  two drawbacks :
    *  No diversity, common instructions
    *  Instructions only ask for one tasks wherase in reallife human instructions have muliple tasks.

#### Skewness toward easy by Human generated open domain instructions
* So to avoid this LLM like openai where trained on open domain instruction generated using human annotators which was a bit time consuming and expensive and the instruction where skewed towards easy and medium type of instructions in comparison to complex instructions.

#### Evol instructions as superhero
* So here comes the hero **evol_instruct** which is a novel technique to automate instructions generation using LLM which generate more balanced open domain instructions of various diffculty level to improve performance of LLMs.
#### How it generates instuctions.
* It generates instuctions in two ways by depth evolving and breadth evolving .
     * In depth evolving complex instructions where generate by adding constraints, deepening, concretizing, increasing reasoning steps and complicate inputs
     * In breadth evolving new complex instructions wherer generate to give diversifications
- <img src="/assets/img/day187 evol_instructions_running.png">

#### Results of evol instructions.
 * Instructions generate with evol-instructs where superior to human generate ones and WizardLM trained using evol-instruct outperform chatgpt under complex test instuctions.

* 📚 Resources : [WizardLM: Empowering Large Language Models to Follow Complex Instructions](https://arxiv.org/abs/2304.12244)


