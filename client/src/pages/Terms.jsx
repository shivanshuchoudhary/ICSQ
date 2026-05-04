import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { motion } from "framer-motion";

function Terms() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a]">
      <div className="max-w-4xl mx-auto">
        <div className="pt-6 flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="hover:bg-[#93725E] hover:text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#93725E]/20"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </span>
          </Button>
          <p className="text-sm bg-gradient-to-r from-amber-200 to-amber-600 bg-clip-text text-transparent font-medium">
            Effective Date: 09th June 2025
          </p>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <Card className="bg-[#2a2a2a]/70 border border-[#93725E]/20 shadow-xl backdrop-blur-sm hover:shadow-2xl hover:shadow-[#93725E]/10 transition-all duration-500">
            <CardHeader className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#93725E]/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="font-bold bg-gradient-to-r from-amber-200 to-amber-600 bg-clip-text text-transparent w-full text-3xl text-center mb-2">
                  Terms and Conditions
                </div>
                <div className="w-32 h-1 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {[
                {
                  title: "1. Introduction",
                  content: (
                    <p>
                      Welcome to the Internal Customer Satisfaction Quotient (ICSQ) platform managed by the Business Excellence division of Sobha Realty. 
                      This Platform is an internal tool developed to facilitate constructive feedback between departments through CSAT/NPS scoring, enabling 
                      departments to enhance performance and collaboration to bring customer Centricity.
                    </p>
                  )
                },
                {
                  title: "2. Eligibility & Access",
                  content: (
                    <p>
                      Access is restricted to authorized employees of Sobha Realty, authenticated through Microsoft Single Sign-On (SSO). 
                      Any unauthorized access or usage is strictly prohibited.
                    </p>
                  )
                },
                {
                  title: "3. Purpose of the Platform",
                  content: (
                    <>
                      <p>The Platform is designed to:</p>
                      <ul className="list-none pl-6 mt-3 space-y-2">
                        {[
                          "Collect inter-departmental feedback using CSAT and/or NPS methodologies.",
                          "Provide insights to support continuous improvement and colloboration.",
                          "Enable Heads of Departments (HODs) to develop actionable plans based on feedback received."
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3">
                        This initiative is led and monitored by the Business Excellence division to promote a culture of operational 
                        excellence and employee engagement.
                      </p>
                    </>
                  )
                },
                {
                  title: "4. Acceptable Use",
                  content: (
                    <>
                      <p>Users of the Platform agree to:</p>
                      <ul className="list-none pl-6 mt-3 space-y-2">
                        {[
                          "Provide honest, respectful, and professional feedback.",
                          "Not engage in any misuse of the system, including but not limited to falsifying input, targeting individuals, or misrepresenting department performance."
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                },
                {
                  title: "5. Data and Feedback Use",
                  content: (
                    <>
                      <p>The Business Excellence division will use submitted feedback to:</p>
                      <ul className="list-none pl-6 mt-3 space-y-2">
                        {[
                          "Identify areas for improvement within departments.",
                          "Track trends and patterns in internal service quality.",
                          "Collaborate with HODs in formulating action plans."
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                },
                {
                  title: "6. Changes to the Platform or Terms",
                  content: (
                    <p>
                      The Business Excellence division reserves the right to enhance, modify, or discontinue features of the Platform 
                      and to update these Terms. Material changes will be communicated internally.
                    </p>
                  )
                },
                {
                  title: "7. Contact",
                  content: (
                    <p>
                      For questions or support, contact the Business Excellence division at:{" "}
                      <a 
                        href="mailto:business_excellence_team@sobharealty.com" 
                        className="text-amber-400 hover:text-amber-300 underline decoration-amber-400/30 hover:decoration-amber-300 transition-all duration-300"
                      >
                        business_excellence_team@sobharealty.com
                      </a>
                    </p>
                  )
                }
              ].map((section, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="p-6 rounded-xl bg-gradient-to-r from-[#2a2a2a]/50 to-transparent border border-[#93725E]/10 hover:border-[#93725E]/30 transition-all duration-300 group"
                >
                  <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-amber-200 to-amber-600 bg-clip-text text-transparent group-hover:from-amber-300 group-hover:to-amber-700 transition-all duration-300">
                    {section.title}
                  </h2>
                  <div className="text-gray-300 leading-relaxed">
                    {section.content}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default Terms;
