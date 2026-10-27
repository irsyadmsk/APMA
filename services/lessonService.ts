// Local template generation and structural checks. No API key or network.
import {lessonDraft,lessonBlock,inspectLesson,type LessonForm} from './lesson-template';
export const generateModulAjar=async (_prompt:string,_image?:unknown,form?:LessonForm):Promise<string>=>{
 if(!form)throw new Error('Lesson form is required for local generation.');
 return lessonDraft(form);
};
export const generatePartialBlock=async(kind:string,_category:string,form:LessonForm,instructions:string,_blocks?:string,_image?:unknown):Promise<string>=>lessonBlock(kind,form,instructions);
export const analyzeModulAjar=async(blocks:{title?:string;content?:string}[],_subject:string):Promise<string>=>{const result=inspectLesson(blocks);return JSON.stringify({...result,warnings:result.feedback.kekurangan.map(message=>({type:'review',message})),recommendations:result.feedback.saran});};
