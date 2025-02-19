const Resume = require('../models/Resume');
const { sendResponse, sendSuccessResponse, sendBadRequestError } = require('../utils/responseHandler');
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAi = new GoogleGenerativeAI('AIzaSyD8-5dAu50JUlmCHU2E_fHZ8tLC4TSE1qY')
const fs = require('fs')
const { fileToJson } = require('../lib/fileUploadLib'); // Import the library

const generativeConfig = {
    model: "gemini-1.5-flash-001",
    temperature: 0.6,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
};
const modal = genAi.getGenerativeModel(generativeConfig); 


/**
 * This function has been made for fetching JSON format of multiple resumes with a limit
 * @param {*} req 
 * @returns 
 */
const resumeRanker = async (req) => {
    try {
        const pdfReaders = req.files;
        const jd = req.body.jd;
        
        const pdfReadersArray = Array.isArray(pdfReaders.resume) ? pdfReaders.resume : [pdfReaders.resume];
        
        const maxResumes = 10;
        const resumesToProcess = pdfReadersArray.slice(0, maxResumes);

        const processingPromises = resumesToProcess.map(async (pdfReader) => {
            
            let jsonData = await fileToJson(pdfReader.data, pdfReader.mimetype);
            let resumeText = jsonData.text;
            
            let inputText = "";
            
            if (req.body.actionType === "submit_score") {
                inputText = `
                Evaluate the following resume text and job description. Provide a comprehensive analysis to determine if this is one of the best candidates for the position. The evaluation should be thorough and result in a clear score and recommendation.
                
                Resume Text: ${resumeText}
                Job Description: ${jd}
                
                Evaluation Criteria:
                
                1. Essential Qualifications:
                - Required education and certifications
                - Mandatory technical skills
                - Minimum years of experience
                
                2. Skills Match Analysis:
                - Technical skills alignment with job requirements
                - Soft skills demonstration
                - Industry-specific knowledge
                
                3. Experience Quality:
                - Relevance to the position
                - Achievement metrics and impact
                - Project complexity and scope
                
                4. Leadership & Growth:
                - Team management experience
                - Project leadership
                - Career progression
                
                Final Response Format:
                
                Score: Provide a score from 1 to 5:
                1 = Below Average
                2 = Average
                3 = Good
                4 = Excellent
                5 = Outstanding (Perfect Match)
                
                Detailed Review:
                - Strengths: List key strengths that make this candidate stand out
                - Areas for Consideration: List any potential gaps or concerns
                - Overall Fit: Explain why this candidate would or wouldn't be among the top choices
                
                Important Notes:
                * Always include the candidate's name in the evaluation
                * Highlight any exceptional qualifications or unique skills
                * Clearly indicate if this is one of the best candidates (Score 4-5)
                * Use simple, clear language
                * Structure the response with numeric bullet points
                `;
                
                const response = await modal.generateContent(inputText);
                const result = response.response.text();
                
                function formatText(text) {
                    text = text.replace(/\*\* (Score: \d+\/\d+ \((.*?)\)) \*\*/g, '<h2>$1</h2>');
                    let formattedText = text.replace(/\*\*(.*?)\*\*/g, `<strong class="heading">$1</strong>`);
                    formattedText = formattedText.replace(/^## (.*)$/gm, '<h2 class="highlighted">$1</h2>');
                    formattedText = formattedText.replace(/(\d+\.)/g, '<strong class="heading">$1</strong>');
                    
                    formattedText = formattedText.replace(/\n\n/g, '<br><br>');
                    formattedText = formattedText.replace(/\n/g, '<br><br>');
                    
                    return formattedText;
                }
                const formattedText = formatText(result);

                return {
                    name: pdfReader.name,
                    result: formattedText
                };
            }
        });
        
        // Wait for all promises to resolve
        const results = await Promise.all(processingPromises);

        return results;

    } catch (error) {
        console.log(error);
        return [];
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

        if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
            return sendBadRequestError(res, `Please select at least one resume.`);
        }

        const parsedData = await resumeRanker(req)
        console.log('parsedData: ', parsedData);

        return sendSuccessResponse(res, `Your score is ready...`, parsedData);

    } catch (error) {
        console.log(error)
        return sendBadRequestError(res, 'An error occurred while scoring the resume');
    }
};



module.exports = {
    getResumeScoreAi
};