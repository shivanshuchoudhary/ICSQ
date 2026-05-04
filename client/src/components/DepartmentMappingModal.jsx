import Button from "./ui/Button"
import { capitalizeFirstLetter } from "../Constants"
import { useToast } from "../contexts/ToastContext"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function DepartmentMappingModal({
  isOpen = false,
  onClose = () => {},
  department = null,
  departments = [],
  onSave = async () => {},
}) {
  const { toast } = useToast();
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (department?.reviewerDepartments) {
      setSelectedDepartments(department.reviewerDepartments);
    } else {
      setSelectedDepartments([]);
    }
  }, [department]);

  const handleDepartmentToggle = (deptId) => {
    setSelectedDepartments(prev => {
      const newSelection = prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId];
      return newSelection;
    });
  };

  const handleSave = async () => {
    try {
      if (!department?._id) {
        throw new Error("No department selected");
      }

      const payload = {
        departmentId: department._id,
        reviewerDepartments: selectedDepartments
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Error saving department mapping:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save department mapping",
        variant: "destructive",
      });
    }
  };

  const filteredDepartments = departments.filter(dept => 
    dept._id !== department?._id && 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && department && departments.length > 0 && (
        <div className="fixed inset-0 z-[100]">
          <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Animated background overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Modal panel with animation */}
            <div className="fixed inset-x-0 top-0 z-10 overflow-y-auto">
              <div className="flex items-start justify-center p-4 text-center sm:p-0">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: -20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="relative transform overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-700"
                >
                  {/* Header */}
                  <div className="relative px-6 py-5 border-b border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold bg-gradient-to-r from-[goldenrod] via-amber-500 to-[goldenrod] bg-clip-text text-transparent">
                          Department Mapping
                        </h3>
                        <p className="mt-2 text-sm text-gray-400">
                          Configure which departments can review <span className="text-[goldenrod] font-medium">{(department?.name || '').toUpperCase()}</span>
                        </p>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
                        type="button"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Search input */}
                    <div className="mt-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search departments..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[goldenrod] focus:ring-1 focus:ring-[goldenrod]"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 bg-gray-900">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <AnimatePresence mode="wait">
                        {filteredDepartments.length === 0 ? (
                          <motion.div
                            key="no-results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center py-4 text-gray-400"
                          >
                            No departments found
                          </motion.div>
                        ) : (
                          <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2"
                          >
                            {filteredDepartments.map((dept, index) => (
                              <motion.div 
                                key={dept._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ 
                                  opacity: 1, 
                                  y: 0,
                                  transition: { delay: index * 0.05 }
                                }}
                                exit={{ opacity: 0, y: 20 }}
                                className={`
                                  group flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out cursor-pointer
                                  ${selectedDepartments.includes(dept._id) 
                                    ? 'bg-gradient-to-r from-[goldenrod]/30 to-amber-500/30 border border-[goldenrod]/40' 
                                    : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-[goldenrod]/30'}
                                `}
                                onClick={() => handleDepartmentToggle(dept._id)}
                                role="button"
                                tabIndex={0}
                              >
                                <div className="flex items-center flex-1">
                                  <div className={`
                                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200
                                    ${selectedDepartments.includes(dept._id)
                                      ? 'bg-[goldenrod] border-[goldenrod]'
                                      : 'border-gray-500 group-hover:border-[goldenrod]'}
                                  `}>
                                    {selectedDepartments.includes(dept._id) && (
                                      <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`ml-3 font-medium ${
                                    selectedDepartments.includes(dept._id)
                                      ? 'text-[goldenrod]'
                                      : 'text-gray-100 group-hover:text-[goldenrod]'
                                  }`}>
                                    {dept.name.toUpperCase()}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="px-4 py-2 text-sm hover:bg-gray-800/50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-[goldenrod] to-amber-500 hover:from-[goldenrod] hover:to-amber-600 text-black font-medium shadow-lg hover:shadow-[goldenrod]/25"
                    >
                      Save Changes
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(31, 41, 55, 0.5);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(218, 165, 32, 0.5);
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(218, 165, 32, 0.7);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
} 