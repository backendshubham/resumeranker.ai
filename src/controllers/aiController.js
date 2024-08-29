const Resume = require('../models/Resume');
const { sendResponse, sendSuccessResponse, sendBadRequestError } = require('../utils/responseHandler');
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAi = new GoogleGenerativeAI('AIzaSyDQPPbzypDQeJHoomkFaFhbO9kEoKLw_nk')
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
                Evaluate the following resume text and job description. Use the STAR method to guide your assessment and provide a final summary, including a numerical score and a descriptive review. The final response should address both the reasons for selecting and rejecting candidates.

                Resume Text: ${resumeText}

                Job Description: ${jd}

                Key Points for Evaluation:

                Reasons for Selecting Candidates:

                Relevant Experience and Clear Role Progression: Assess if the resume shows relevant experience with a clear progression of responsibilities.
                Quantifiable Achievements: Determine if the resume highlights specific, measurable achievements that reflect the candidate's impact.
                Technical Expertise and Versatility: Check if the resume lists relevant technical skills and demonstrates adaptability across various roles or industries.
                Leadership and Team Collaboration: Look for evidence of leadership and effective teamwork.
                Alignment with Industry Standards and Continuous Improvement: Evaluate if the resume shows adherence to industry standards and a commitment to ongoing learning.
                Reasons for Rejecting Candidates:

                Lack of Relevant Experience: Identify any misalignment between the candidate's experience and the job requirements.
                Vague Descriptions and Unquantified Achievements: Note if the resume has vague descriptions or lacks specific, quantifiable outcomes.
                Inconsistent Formatting and Poor Structure: Check for any poor formatting or disorganization.
                No Demonstrated Leadership or Team Experience: Look for a lack of evidence for leadership or teamwork.
                Lack of Adaptability and Versatility: Assess if the resume shows limited experience across different roles or industries.
                Final Response:

                Based on the evaluation of the resume against the job description, provide a numerical score from 1 to 5 and a descriptive review:

                Score: Provide a score from 1 to 5:

                1 = Poor
                2 = Fair
                3 = Good
                4 = Very Good
                5 = Excellent
                Review: Summarize the candidate's overall suitability for the position based on the key criteria. Include strengths and weaknesses and offer a brief explanation for the score.

                Example Response:

                Score: 3/5 (Good)
                Review: The candidate demonstrates solid relevant experience with a clear role progression and some measurable achievements. However, the resume lacks consistency in formatting and does not provide sufficient examples of leadership or adaptability across various roles. Overall, the candidate is a good fit but has areas for improvement.
                Always return name in Resume Evaluation

                Note:
                *Always include the name in the resume evaluation. 
                *Review always be visible.
                *Conclusion always be visible.
                *Reasons for Selecting Candidates should be in Strengths section and Reasons for Rejecting Candidates should be in weaknesses section.      
                *The response should be in simple language.
                *Please provide your response using numeric bullet points. Ensure each sentence is clear and correctly structured.
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

        return sendSuccessResponse(res, `Your score is ready...`, parsedData);

    } catch (error) {
        console.log(error)
        return sendBadRequestError(res, 'An error occurred while scoring the resume');
    }
};



module.exports = {
    getResumeScoreAi
};