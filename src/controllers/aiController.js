const Resume = require('../models/Resume');
const { sendResponse, sendSuccessResponse, sendBadRequestError } = require('../utils/responseHandler');
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAi = new GoogleGenerativeAI('AIzaSyDQPPbzypDQeJHoomkFaFhbO9kEoKLw_nk')
const fs = require('fs')
const { fileToJson } = require('../lib/fileUploadLib'); // Import the library

const modal = genAi.getGenerativeModel({
    model: "gemini-1.5-flash-001"
});

/**
 * This function has been made for fetching JSON format of a resume
 * @param {*} req 
 * @returns 
 */
const resumeRanker = async (req) => {
    try {

        const pdfReader = req.files,
         jd = req.body.jd;

        let candidatePossition = req.body.candidatePossition, 
         finder = req.body.finder

        if(candidatePossition){
           candidatePossition = `Candidate Possition: ${candidatePossition}`
        }

        if(finder){
            finder = `Who is finding cantidate: ${finder}`
         }

        let jsonData = await fileToJson(pdfReader.resume.data, pdfReader.resume.mimetype),
            resumeText = jsonData.text

        let inputText = ""

        if (req.body.actionType == "submit_score") {
            inputText = `Analyze the provided resume based on the STAR framework: Situation, Task, Action, and Result. Score each section and provide an overall score. Highlight strengths and suggest areas for improvement based on how well the resume follows the STAR method.`
        } else if (req.body.actionType == "submit_gather") {
            inputText = `The resume provided is missing details related to the STAR framework. Ask the candidate targeted questions to gather information about specific situations, tasks, actions, and results in their past roles.`
        } else if (req.body.actionType == "submit_feedback") {
            inputText = `After collecting additional STAR details, re-score the resume. Provide a detailed report showing the initial score, suggested improvements, and the final score, guiding the candidate on how to present their resume more effectively.`
        }

        const note = `Note: Return the final response in html tags. All the score should be always be out of 10.`

        const temperature = 0.3;

        const response = await modal.generateContent(`resume:${resumeText} check: ${inputText} Jd: ${jd} ${{ temperature }} ${candidatePossition} ${finder} ${note}`);
        const result = response.response.text();

        function formatText(text) {
            // Replace **text** with <strong>text</strong>
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
            // Replace \n with <br>
            formattedText = formattedText.replace(/\n/g, '<br>');
        
            return formattedText;
        }
        const formattedText = formatText(result);

        // let cleanedJsonString = result.replace(/```json/g, '').replace(/```/g, '').trim();
        // cleanedJsonString =  JSON.parse(cleanedJsonString)
        return formattedText;

    } catch (error) {
        console.log(error)
        return {}
    }
}

/**
 * Get resume score by using gemini
 * @param {*} req 
 * @returns 
 */
const getResumeScoreAi = async (req, res) => {
    try {

        if (!req.body.actionType && req.body.actionType != "submit_score" && req.body.actionType != "submit_gather" && req.body.actionType != "submit_feedback") {
            req.actionType != "submit_score"
        }

        const parsedData = await resumeRanker(req)

        return sendSuccessResponse(res, `Your score is ready...`, parsedData);

    } catch (error) {
        console.log(error)
        return sendBadRequestError(res, 'An error occurred while scoring the resume');
    }
};

/**
 * This function has been made for fetching JSON format of a resume
 * @param {*} req 
 * @returns 
 */
const resumeParser = async (req) => {
    try {
        const pdfReader = req.files;
        let jsonData = await fileToJson(pdfReader.resume.data, pdfReader.resume.mimetype);

        // const whatHasToReturn = `I want only an object with only these given points in return like name, email, phone, education, yearsOfExperience, summary, skills, workExperience and the name should always be first letter capital and yearsOfExperience always should be nuber non decimal`

        // const whatHasToReturn = `Return a JSON object with the following fields: name, email, phone, education, yearsOfExperience, summary, skills, and workExperience. Ensure the 'name' field starts with a capital letter, and 'yearsOfExperience' is a whole number (no decimals).
        
        // Note: Here we want the json response faster, So please generate fast response in less then 10 seconds.
        // `

        // const whatHasToReturn = `Extract and return only the following fields in JSON format: name, email, phone, education, yearsOfExperience, summary, skills, workExperience. Ensure 'name' starts with a capital letter and 'yearsOfExperience' is an integer.`

        const whatHasToReturn = `System Instructions 

            # Role Assignment
            You are a resume analyzer adept at extracting key information from resumes for HR purposes.

            # Output Format
            Your output will strictly adhere to JSON format, ensuring seamless integration with data processing pipelines.

            # Output Requirements
            Each analysis output must include the following elements:

            *name 
            *phone
            *email
            *yearsOfExperience
            *summary
            *skills
            *workExperience.
            
            **Note**
            - Ensure the 'name' field starts with a capital letter, and 'yearsOfExperience' is a whole number (no decimals).
            `

        
        // console.log("start :", new Date())
        const response = await modal.generateContent(jsonData.text + whatHasToReturn);
        const resp = response.response.text();
        // console.log("end :", new Date())


        const jsonStringCleaned = resp
            .replace(/```json\s*/, '')  // Remove the opening backticks and "json"
            .replace(/\s*```/, '');     // Remove the closing backticks

        jsonData = JSON.parse(jsonStringCleaned);
        return jsonData;

    } catch (error) {
        console.log(error)
        return {}
    }
}

/**
 * Fetching score from here
 * @param {*} req 
 * @returns 
 */
const evaluateSection = async (title, sectionText, jd) => {
    try {
        if(jd == `STAR Method`){
            switch (title) {
                case 'summary': 
                jd = `Situation: What is the overall context or background described in the summary?
                Task: What specific career goals, roles, or responsibilities are highlighted?
                Action: What significant steps or initiatives are mentioned?
                Result: What major achievements, milestones, or impacts are noted?`;
                break;
                case 'skills' : 
                jd =` Situation: In what context or projects are the skills applied ?
                Task : How are these skills relevant to the roles or responsibilities described ?
                Action : What examples of using these skills are provided?
                Result: What outcomes or measurable impacts resulted from using these skills?`;
                break;
                case  'workExperience' : 
                jd =` For each job role listed, extract the following details:
                Situation: What was the context or challenge in each role ?
                Task : What specific role or responsibilities did the candidate have ?
                Action : What steps or strategies did the candidate take ?
                Result : What measurable outcomes or achievements resulted from their actions ?`
                break;
            }
        }
        let maxPoints = 40;
        if(title == 'summary') {
            maxPoints = 20;
        }

        const messagePrompt = `
        Rate the following sections on a scale from 0 to ${maxPoints} based on how well they align with the job description (JD). 
        Please provide only the numeric score without any additional text. Here is the information in JSON format:
        
        Section Title: ${title}
        Section Content: ${sectionText}
        
        Job Description (JD): ${jd}

        **Note:** 
        -If the same parameters (section title, section content, and job description) are provided, the score should always be the same numeric value, achieved through a consistent hashing function.
        `

        // Generate the content using the refined message prompt
        const response = await modal.generateContent(messagePrompt);
        const scoreText = response.response.text();

        return parseFloat(scoreText);
    } catch (error) {
        return 0;
    }
};

/**
 * Get resume score by using gemini
 * @param {*} req 
 * @returns 
 */
const getResumeScore = async (req, res) => {

    let { jd } = req.body;

    const parsedData = await resumeParser(req)
    const { name, summary, skills, workExperience } = parsedData;
    console.log("parsedData :", parsedData)

    if (!summary || !skills || !workExperience) {
        return sendBadRequestError(res, 'All sections must be provided');
    }

    if (!jd) {
        jd = `STAR Method`
    }

    try {
        let cappedScores = {};

        const checkResume = await Resume.aggregate([
            { $match: { "resumeJson.name": parsedData.name } },
            { $match: { "resumeJson.email": parsedData.email } },
            { $match: { "resumeJson.phone": parsedData.phone } },
            { $match: { "resumeJson.yearsOfExperience": parsedData.yearsOfExperience } },
            { $match: { "jd": jd } }
        ]);

        if (checkResume.length == 0) {

            const maxPoints = 40;

            let scores = await Promise.all([
                evaluateSection("summary", summary, jd),
                evaluateSection("skills", skills, jd),
                evaluateSection("workExperience", workExperience, jd),
            ]);

            scores = scores.map(score => isNaN(score) ? 0 : score);

            cappedScores = {
                summary: Math.min(scores[0], 20),
                skills: Math.min(scores[1], maxPoints),
                workExperience: Math.min(scores[2], maxPoints),
            };
            const resume = new Resume({
                resumeJson: parsedData,
                jd: jd,
                result: cappedScores
            });

            await resume.save();
        } else {
            cappedScores = checkResume[0].result
        }

        const totalScore = Math.min(Object.values(cappedScores).reduce((acc, score) => acc + score, 0), 100);

        const response = {
            scores: cappedScores,
            totalScore: totalScore,
        };

        return sendSuccessResponse(res, `${name}, your resume score is ${totalScore}.`, response);

    } catch (error) {
        console.log(error)
        return sendBadRequestError(res, 'An error occurred while scoring the resume');
    }
};



module.exports = {
    getResumeScoreAi,
    getResumeScore
};
