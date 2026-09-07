(()=>{'use strict';
const DEMO_FLAG='eviaDemoModeV1';
const DEMO_META_KEY='eviaNaxosCourseMetaV1';

const TASKS=[
  {
    id:'K1',
    title:'Stationery Detective',
    teaching:[
      'Start with what you can actually observe: its shape, material, moving parts and any markings. Those clues help you identify the object accurately.',
      'Then explain its purpose by saying what job it helps you do. For example, a stapler joins sheets of paper; a ruler helps measure or draw straight lines.',
      'A strong explanation links a feature to the purpose. Do not just name the object — explain how or why it is useful.'
    ],
    questions:[
      {q:'You choose a stapler. Which explanation best shows what it is used for?',a:['It is usually kept on a desk.','It joins sheets of paper together using metal staples.','It is made from metal and plastic.','It can come in different colours.'],correct:1},
      {q:'What is the best first step when identifying an unfamiliar piece of stationery?',a:['Guess from its colour.','Ask someone for the answer immediately.','Look carefully at its visible features and how its parts are arranged.','Choose the nearest object instead.'],correct:2},
      {q:'Which evidence best completes Stationery Detective?',a:['A clear photo plus a short explanation of what the item is and what it does.','A photo with no explanation.','A description of an object that is not shown.','Only the brand name written down.'],correct:0}
    ]
  },
  {
    id:'K2',
    title:'Mystery Object',
    teaching:[
      'Good descriptions use observable details: size, shape, colour, material, texture, parts and what the object appears to do.',
      'If you want someone to guess the object, give useful clues without simply saying its name. Specific details work better than vague words like nice, weird or big.',
      'When you explain why you chose it, point to the particular feature that made it unusual or interesting.'
    ],
    questions:[
      {q:'Which description gives the clearest clues without simply naming the object?',a:['It is a thing over there.','It is quite unusual and I like it.','It is the cup on the table.','It is a small cylindrical object with a handle on one side and an open top.'],correct:3},
      {q:'What makes a Mystery Object description useful?',a:['It uses several specific features that another person could recognise.','It contains as many long words as possible.','It avoids mentioning anything visible.','It only explains where you found it.'],correct:0},
      {q:'Which explanation best justifies choosing an object as the strangest one nearby?',a:['I chose it because I had to choose something.','I chose it because its unusual folding shape is different from everything else on the desk.','I chose it because it was closest to me.','I chose it because I know its name.'],correct:1}
    ]
  },
  {
    id:'S1',
    title:'Rock, Paper, Scissors',
    teaching:[
      'Remember the rule cycle: rock beats scissors, scissors beats paper, and paper beats rock.',
      'In a best-of-three match, the first player to win two rounds wins the match. You still need enough evidence to make the result clear.',
      'Good evidence shows the hands or outcome of each round and makes the final winner obvious, rather than recording only one isolated moment.'
    ],
    questions:[
      {q:'One player chooses paper and the other chooses rock. Who wins the round?',a:['Rock wins because it is harder.','It is automatically a draw.','Paper wins because paper covers rock.','The previous round decides it.'],correct:2},
      {q:'In a best-of-three match, you win rounds one and three and lose round two. What is the final result?',a:['You win the match 2–1.','The match is a draw.','You need to play two more rounds.','Your opponent wins because they won the middle round.'],correct:0},
      {q:'Which evidence most clearly proves the result of the Rock, Paper, Scissors challenge?',a:['A photo taken before anyone plays.','A note saying that a game happened.','A picture of only the final winner.','A short video showing the rounds and making the final winner clear.'],correct:3}
    ]
  },
  {
    id:'S2',
    title:'30-Second Tower',
    teaching:[
      'A stable tower normally starts with a secure, reasonably wide base. The base has to support everything placed above it.',
      'Keeping heavier objects lower usually helps because it keeps the centre of mass down. Putting a heavy object high up can make the tower easier to tip.',
      'If the tower leans or falls, look at where the weight sits over the base. Repositioning the objects so the load is better supported can improve stability.'
    ],
    questions:[
      {q:'Your three-object tower keeps tipping sideways. Which change is most likely to improve its stability?',a:['Make the base wider and support the upper objects more centrally.','Put the heaviest object at the very top.','Move every object further to the same side.','Make the base narrower so it takes less space.'],correct:0},
      {q:'Why can placing the heaviest object at the top make a tower less stable?',a:['It makes the objects change material.','It removes all friction between the objects.','It raises the centre of mass and can make the tower easier to tip.','It always makes the base larger.'],correct:2},
      {q:'The tower is leaning even though the base has not moved. What is the best thing to check?',a:['Whether all three objects are the same colour.','Whether the load above is positioned over and supported by the base.','Whether the tallest object was picked first.','Whether the timer has already stopped.'],correct:1}
    ]
  },
  {
    id:'B1',
    title:'Tongue-Twister Test',
    teaching:[
      'The goal is clear communication, not maximum speed. A steady pace makes it easier to pronounce each word cleanly.',
      'If you make a mistake, reset, take a breath and try again. Rushing harder usually creates more mistakes rather than fixing them.',
      'The challenge asks for five clean repetitions, so persistence matters: adjust your pace and keep going until the words stay clear.'
    ],
    questions:[
      {q:'Your words start becoming unclear halfway through the tongue twister. What is the best response?',a:['Speak even faster to finish sooner.','Skip the difficult words.','Stop the recording permanently.','Slow down, reset and try again at a controlled pace.'],correct:3},
      {q:'What counts as completing the Tongue-Twister Test?',a:['Five clear repetitions without a mistake.','One very fast repetition.','Five attempts whether or not the words are correct.','Any recording longer than five seconds.'],correct:0},
      {q:'Which behaviour is the challenge mainly demonstrating when an attempt goes wrong?',a:['Ignoring the mistake and claiming it was correct.','Staying calm, adjusting and trying again.','Changing to a completely different task.','Getting someone else to finish your recording.'],correct:1}
    ]
  },
  {
    id:'B2',
    title:'Find Someone Who…',
    teaching:[
      'Read the condition carefully before choosing someone or something. Your choice has to match the actual challenge, not just be convenient.',
      'Your evidence should make the match believable. A suitable photo plus a short explanation can show both what you chose and why it fits.',
      'If you are completing the demo on your own, use the solo version of the challenge rather than pretending a colleague is present.'
    ],
    questions:[
      {q:'The challenge says to find someone wearing something blue. Which evidence is strongest?',a:['A photo of any colleague with no explanation.','A photo that clearly shows the blue item plus a short explanation of why the person matches.','A written guess about who might own something blue.','A photo of an empty chair.'],correct:1},
      {q:'You are completing Find Someone Who… on your own. What should you do?',a:['Invent a colleague and continue.','Skip all evidence but mark the task complete.','Use the solo alternative challenge provided by Evia.','Choose a random old photo from your phone.'],correct:2},
      {q:'Which explanation best shows that your choice meets a challenge condition?',a:['I picked this because it was easy.','This is my answer.','I chose this person because their blue jacket clearly matches the condition I was given.','Someone else told me to choose them.'],correct:2}
    ]
  }
];

const BY_ID=Object.fromEntries(TASKS.map(task=>[task.id,task]));
const original={};

function demoMode(){
  try{
    if(localStorage.getItem(DEMO_FLAG)==='1')return true;
    const meta=JSON.parse(localStorage.getItem(DEMO_META_KEY)||'{}');
    return meta?.demo===true||String(meta?.standardCode||'')==='EVIA-DEMO'
  }catch{return false}
}
function exact(options){return options.map(option=>({...option,__eviaDemoExact:true}))}
function challengeOptions(action){return exact(TASKS.map((task,index)=>({label:task.title,action,value:action==='teach-pick'?index:`demo:${task.id}`})))}
function normalisedQuestions(task){return (task?.questions||[]).map((question,index)=>({
  q:String(question.q||''),a:(question.a||[]).map(String),correct:Number(question.correct),
  explanation:'',id:`DEMO-${task.id}-Q${index+1}`,difficulty:'demo',mappings:[task.id],source:'Evia demo'
}))}

function installExactOptionSupport(){
  try{
    if(typeof prepareChatOptions!=='function'||prepareChatOptions.__eviaDemoExact)return;
    const base=prepareChatOptions;
    const wrapped=function(options=[]){
      if(demoMode()&&Array.isArray(options)&&options.some(option=>option?.__eviaDemoExact)){
        try{chatOptionOverflow=[]}catch{}
        return options.filter(Boolean).map(option=>{const clean={...option};delete clean.__eviaDemoExact;return clean})
      }
      return base.apply(this,arguments)
    };
    wrapped.__eviaDemoExact=true;prepareChatOptions=wrapped
  }catch{}
}

function installTeaching(){
  try{
    if(typeof startTeachMe==='function'&&!startTeachMe.__eviaDemoTasks){
      original.startTeachMe=startTeachMe;
      const wrapped=async function(){
        if(!demoMode())return original.startTeachMe.apply(this,arguments);
        teachState={demo:true,path:[],items:TASKS.map(task=>({id:task.id,label:task.title}))};
        await chatSay('Which challenge do you want to go over?',challengeOptions('teach-pick'))
      };
      wrapped.__eviaDemoTasks=true;startTeachMe=wrapped
    }
  }catch{}
  try{
    if(typeof teachPick==='function'&&!teachPick.__eviaDemoTasks){
      original.teachPick=teachPick;
      const wrapped=async function(index){
        if(!demoMode()||!teachState?.demo)return original.teachPick.apply(this,arguments);
        const task=TASKS[Number(index)];if(!task)return;
        teachState.path=[task.title];teachState.current=task.id;
        for(const point of task.teaching)await chatSay(point);
        await chatSay('Want to try that challenge now?',exact([
          {label:'Test me on this',action:'test-category',value:`demo:${task.id}`},
          {label:'Teach another',action:'teach-me'},
          {label:'Main menu',action:'chat-home'}
        ]))
      };
      wrapped.__eviaDemoTasks=true;teachPick=wrapped
    }
  }catch{}
}

function installTesting(){
  try{
    if(typeof testBankForCategory==='function'&&!testBankForCategory.__eviaDemoTasks){
      original.testBankForCategory=testBankForCategory;
      const wrapped=function(category){
        const value=String(category||'');
        if(demoMode()&&value.startsWith('demo:'))return normalisedQuestions(BY_ID[value.slice(5)]);
        return original.testBankForCategory.apply(this,arguments)
      };
      wrapped.__eviaDemoTasks=true;testBankForCategory=wrapped
    }
  }catch{}
  try{
    if(typeof startTestMe==='function'&&!startTestMe.__eviaDemoTasks){
      original.startTestMe=startTestMe;
      const wrapped=async function(){
        if(!demoMode())return original.startTestMe.apply(this,arguments);
        try{testState=null}catch{}
        await chatSay('Which challenge should I test you on?',challengeOptions('test-category'))
      };
      wrapped.__eviaDemoTasks=true;startTestMe=wrapped
    }
  }catch{}
}

function install(){
  installExactOptionSupport();installTeaching();installTesting();
  window.EviaDemoTeachTestV1=Object.freeze({version:1,tasks:TASKS.map(task=>({id:task.id,title:task.title,teachingPoints:task.teaching.length,questions:task.questions.length})),questionCount:TASKS.reduce((sum,task)=>sum+task.questions.length,0)})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
