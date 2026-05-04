import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import DashboardHeader from "../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table"
import axios from "axios"
import { capitalizeFirstLetter, Server } from "../Constants"
import { FaPlus, FaTrash, FaEdit, FaCheckCircle, FaMapMarkedAlt, FaBan } from "react-icons/fa"

function SIPOCPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState([false, ""])
  const [isEditing, setIsEditing] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [sipocEntries, setSipocEntries] = useState([])
  const [modalOpen, setModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageModal, setImageModal] = useState({ open: false, src: "" })
  const [sortedEntries, setSortedEntries] = useState({
    surveyed: [],
    mapped: [],
    notEligible: []
  })
  const [newEntry, setNewEntry] = useState({
    supplier: "",
    input: "",
    process: {
      input: "",
      file: ""
    },
    output: "",
    customer: "",
  })
  const { toast } = useToast()
  const { currentUser, getCurrentDepartment } = useAuth()

  const sortEntries = (entries) => {
    const sorted = {
      surveyed: [],
      mapped: [],
      notEligible: []
    };

    entries.forEach(entry => {
      if (entry.isSurveyed) {
        sorted.surveyed.push(entry);
      } else if (entry.isMapped) {
        sorted.mapped.push(entry);
      } else {
        sorted.notEligible.push(entry);
      }
    });

    setSortedEntries(sorted);
  };

  const fetchData = async () => {
    try {
      if (getCurrentDepartment()?._id) {
        try {
          const response = await axios.get(`${Server}/sipoc?departmentId=${getCurrentDepartment()?._id}`, {
            withCredentials: true,
          });
          setSipocEntries(response.data || []);
          sortEntries(response.data || []);
        } catch (error) {
          if (error.response?.status === 404) {
            setSipocEntries([]);
            setSortedEntries({ surveyed: [], mapped: [], notEligible: [] });
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load SIPOC data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData()
  }, [currentUser])

  const handleInputChange = (field, value) => {
    setNewEntry((prev) => {
      // Handle nested fields like "process.input"
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        };
      }
      // Handle simple fields
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      supplier: entry.entries.supplier,
      input: entry.entries.input,
      process: {
        input: entry.entries.process.input,
        file: entry.entries.process.file
      },
      output: entry.entries.output,
      customer: entry.entries.customer,
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleAddOrUpdateEntry = async (e) => {
    e.preventDefault();
    
    // Remove mandatory validation - allow empty fields
    // if (!Object.values(newEntry).every((value) => typeof value === 'string' ? value.trim() : true)) {
    //   toast({
    //     title: "Incomplete Entry",
    //     description: "Please fill in all fields",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    const fileInput = document.getElementById("processPicture");
    const file = fileInput?.files[0];

    try {
      setIsAdding(true);
      const formData = new FormData();
      formData.append('departmentId', getCurrentDepartment()?._id);
      formData.append('entries', JSON.stringify(newEntry));
      if (file) {
        formData.append('processPicture', file);
      }

      if (isEditing && editingEntry) {
        // Update existing entry
        await axios.put(`${Server}/sipoc/${editingEntry._id}`, formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast({
          title: "Success",
          description: "SIPOC entry has been updated",
        });
      } else {
        // Add new entry
        const res = await axios.post(`${Server}/sipoc`, formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (res.status === 200) {
          toast({
            title: "Success",
            description: "New SIPOC entry has been added",
          });
        }
      }

      setNewEntry({
        supplier: "",
        input: "",
        process: {
          input: "",
          file: ""
        },
        output: "",
        customer: "",
      });
      setIsEditing(false);
      setEditingEntry(null);
      fetchData();
    } catch (error) {
      toast({
        title: isEditing ? "Failed to Update Entry" : "Failed to Add Entry",
        variant: "destructive",
        description: error?.response?.data?.message || "Something went wrong! Try Again",
      });
    } finally {
      setModalOpen(false);
      setIsAdding(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    setIsDeleting([true, id])
    try {
      await axios.delete(`${Server}/sipoc?id=${id}`, { withCredentials: true })
      toast({
        title: "Entry Deleted",
        description: "SIPOC entry has been removed",
      })
      fetchData()
    } catch (error) {
      toast({
        title: "Failed to delete SIPOC",
        type: "destructive",
        description: "Something went wrong! Try Again",
      })
    } finally {
      setIsDeleting([false, ""])
    }
  }

  const renderTable = (entries, title, icon, colorClass) => {
    if (entries.length === 0) return null;

    return (
      <div className="mb-8">
        {/* <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className={`text-lg font-semibold ${colorClass}`}>{title}</h3>
        </div> */}
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[900px] w-full bg-[#232026]/80">
            <TableHeader>
              <TableRow className="bg-[#93725E] text-[#FFF8E7] shadow-sm">
                <TableHead className="font-semibold text-base py-5 px-2 tracking-wide min-w-[160px]">Supplier</TableHead>
                <TableHead className="font-semibold text-base py-5 px-2 tracking-wide min-w-[160px]">Input</TableHead>
                <TableHead className="font-semibold text-base py-5 px-2 tracking-wide min-w-[220px]">Process</TableHead>
                <TableHead className="font-semibold text-base py-5 px-2 tracking-wide min-w-[160px]">Output</TableHead>
                <TableHead className="font-semibold text-base py-5 px-2 tracking-wide min-w-[160px]">Customer</TableHead>
                {(["admin", "hod"].includes(currentUser?.role)) && (
                  <TableHead className="w-[140px] font-semibold text-center py-5 px-2 min-w-[120px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow
                  key={index}
                  className={`border-b border-muted-foreground/20 transition-all duration-200 group
                    ${index % 2 === 0 ? 'bg-[#232026]/60 hover:bg-[#232026]/80' : 'bg-[#232026]/40 hover:bg-[#232026]/60'}
                  `}
                >
                  <TableCell className="text-[#FFF8E7] align-top p-2 sm:p-4 max-w-[200px] transition-all duration-200">
                    <div className="space-y-1.5 break-words">
                      {entry?.entries?.supplier.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap text-[14px] group-hover:font-medium transition-all">
                          {line.trim() && (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#FFF8E7] align-top p-2 sm:p-4 max-w-[200px] transition-all duration-200">
                    <div className="space-y-1.5 break-words">
                      {entry?.entries?.input.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap text-[14px] group-hover:font-medium transition-all">
                          {line.trim() && (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#FFF8E7] align-top p-2 sm:p-4 max-w-[300px] transition-all duration-200">
                    <div className="space-y-1.5 break-words">
                      {entry?.entries?.process?.input.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap text-[14px] group-hover:font-medium transition-all">
                          {line.trim() && (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                      {entry?.entries?.process?.file && (
                        <button
                          className="text-[#93725E] hover:text-[goldenrod] underline transition-colors text-xs mt-3 hover:scale-[1.02] transform duration-200 flex items-center gap-1.5 group-hover:font-medium"
                          onClick={() => setImageModal({ open: true, src: entry?.entries?.process?.file })}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          View Process Diagram
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#FFF8E7] align-top p-2 sm:p-4 max-w-[200px] transition-all duration-200">
                    <div className="space-y-1.5 break-words">
                      {entry?.entries?.output.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap text-[14px] group-hover:font-medium transition-all">
                          {line.trim() && (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#FFF8E7] align-top p-2 sm:p-4 max-w-[200px] transition-all duration-200">
                    <div className="space-y-1.5 break-words">
                      {entry?.entries?.customer.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed whitespace-pre-wrap text-[14px] group-hover:font-medium transition-all">
                          {line.trim() && (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  {(["admin", "hod"].includes(currentUser?.role)) && (
                    <TableCell className="align-top transition-all duration-200 p-2 sm:p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 transition-all duration-200 hover:scale-110"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <FaEdit className="w-4 h-4" />
                        </Button>
                        {!(isDeleting[1] === entry._id) ? (
                          <Button
                            variant="ghost"
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-200 hover:scale-110"
                            onClick={() => handleDeleteEntry(entry._id)}
                          >
                            <FaTrash className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center w-9 h-9">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#83725E]"></div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#29252c]">
      <DashboardHeader user={currentUser} />

      <main className="container mx-auto py-6 mx:2 px-2">
        <Card className="mb-6 bg-[#29252c]/70 backdrop-blur-sm border border-gray-700 shadow-xl w-full">
          <CardHeader className="border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
            <CardTitle className="flex items-center justify-between text-[#FFF8E7]">
              <span>SIPOC Management - {capitalizeFirstLetter(getCurrentDepartment()?.name)}</span>
              {(["admin", "hod"].includes(currentUser?.role)) && (
                <Button onClick={() => { setModalOpen(true) }} disabled={isLoading}>
                  <FaPlus className="mr-2" />
                  Add Entry
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#FFF8E7] mb-4">
              SIPOC (Supplier, Input, Process, Output, Customer) is a tool that summarizes the inputs and outputs of one
              or more processes in table form. It is used to define a business process before work begins.
            </p>

            {renderTable(
              sortedEntries.surveyed,
              "Surveyed Departments",
              <FaCheckCircle className="text-green-500 w-5 h-5" />,
              "text-green-400"
            )}

            {renderTable(
              sortedEntries.mapped,
              "Mapped Departments",
              <FaMapMarkedAlt className="text-blue-500 w-5 h-5" />,
              "text-blue-400"
            )}

            {renderTable(
              sortedEntries.notEligible,
              "Not Eligible Departments",
              <FaBan className="text-red-500 w-5 h-5" />,
              "text-red-400"
            )}

            {Object.values(sortedEntries).every(arr => arr.length === 0) && (
              <div className="text-center py-8 text-[#FFF8E7]">
                No SIPOC entries found. Click the "Add Entry" button to create one.
              </div>
            )}

            

           
          </CardContent>
        </Card>
        {/* Add/Edit Entry Modal */}
        {modalOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex justify-center items-center z-50 px-3">
                <div className="rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative bg-[#29252c]/95 backdrop-blur-sm border border-gray-700 text-white transform transition-all duration-300 ease-out z-[1000]">
                  {/* Header */}
                  <div className="sticky top-0 bg-[#29252c]/95 px-4 py-3 border-b border-gray-700/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-[#FFF8E7]">
                        {isEditing ? "Edit SIPOC Entry" : "Add New SIPOC Entry"}
                      </h2>
                      <button
                        onClick={() => {
                          setModalOpen(false);
                          setIsEditing(false);
                          setEditingEntry(null);
                          setNewEntry({
                            supplier: "",
                            input: "",
                            process: {
                              input: "",
                              file: ""
                            },
                            output: "",
                            customer: "",
                          });
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {isEditing && (
                      <p className="mt-1.5 text-xs text-[#FFF8E7]/70">
                        Editing entry created on {new Date(editingEntry.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAddOrUpdateEntry} className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Supplier */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Supplier
                          </label>
                          <textarea
                            placeholder="Enter suppliers (one per line)..."
                            value={newEntry.supplier}
                            onChange={(e) => handleInputChange("supplier", e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-2 rounded-md text-sm text-white placeholder-gray-400
                              focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:outline-none
                              transition-all duration-200"
                            rows={3}
                          />
                        </div>

                        {/* Input */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Input
                          </label>
                          <textarea
                            placeholder="Enter inputs (one per line)..."
                            value={newEntry.input}
                            onChange={(e) => handleInputChange("input", e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-2 rounded-md text-sm text-white placeholder-gray-400
                              focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:outline-none
                              transition-all duration-200"
                            rows={3}
                          />
                        </div>

                        {/* Process */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Process
                          </label>
                          <textarea
                            placeholder="Enter process steps (one per line)..."
                            value={newEntry.process.input}
                            onChange={(e) => handleInputChange("process.input", e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-2 rounded-md text-sm text-white placeholder-gray-400
                              focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:outline-none
                              transition-all duration-200"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Output */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Output
                          </label>
                          <textarea
                            placeholder="Enter outputs (one per line)..."
                            value={newEntry.output}
                            onChange={(e) => handleInputChange("output", e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-2 rounded-md text-sm text-white placeholder-gray-400
                              focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:outline-none
                              transition-all duration-200"
                            rows={3}
                          />
                        </div>

                        {/* Customer */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Customer
                          </label>
                          <textarea
                            placeholder="Enter customers (one per line)..."
                            value={newEntry.customer}
                            onChange={(e) => handleInputChange("customer", e.target.value)}
                            className="w-full bg-white/5 border border-white/20 p-2 rounded-md text-sm text-white placeholder-gray-400
                              focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:outline-none
                              transition-all duration-200"
                            rows={3}
                          />
                        </div>

                        {/* Process Diagram */}
                        <div className="form-group">
                          <label className="block text-xs font-medium mb-1.5 text-[#FFF8E7]">
                            Process Diagram
                          </label>
                          <div className="space-y-2">
                            {isEditing && editingEntry?.entries?.process?.file && (
                              <div className="p-2 bg-white/5 rounded-md border border-white/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[#FFF8E7]/70">Current Image:</span>
                                  <button
                                    type="button"
                                    onClick={() => setImageModal({ open: true, src: editingEntry.entries.process.file })}
                                    className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Image
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="relative">
                              <input
                                id="processPicture"
                                type="file"
                                accept="image/*"
                                className="block w-full text-sm text-[#FFF8E7]
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-medium
                                  file:bg-blue-500/10 file:text-blue-400
                                  hover:file:bg-blue-500/20
                                  cursor-pointer
                                  transition-all duration-200"
                              />
                              <p className="mt-1 text-xs text-[#FFF8E7]/70">
                                {isEditing ? "Upload a new image to replace the current one" : "Upload an image for the process diagram"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setModalOpen(false);
                          setIsEditing(false);
                          setEditingEntry(null);
                          setNewEntry({
                            supplier: "",
                            input: "",
                            process: {
                              input: "",
                              file: ""
                            },
                            output: "",
                            customer: "",
                          });
                        }}
                        className="px-6 py-2.5 rounded-lg border border-white/20 text-[#FFF8E7] hover:text-white
                          hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAdding}
                        className={`px-4 py-1 text-sm rounded-lg bg-gradient-to-r from-blue-500 to-blue-600
                          text-white font-medium shadow-lg shadow-blue-500/20
                          hover:shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700
                          focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                          transition-all duration-200 flex items-center gap-2
                          ${isAdding ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {!isAdding ? (
                          <>
                            {isEditing ? <FaEdit className="w-4 h-4" /> : <FaPlus className="w-4 h-4" />}
                            {isEditing ? "Save Changes" : "Add Entry"}
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
         {imageModal.open && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4 min-h-screen">
                <div className="rounded-lg p-6 max-w-4xl w-full max-h-[80vh] bg-[#29252c]/95 backdrop-blur-sm border border-gray-700 shadow-2xl my-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#FFF8E7]">Process Image</h3>
                    <button 
                      onClick={() => setImageModal({ open: false, src: "" })} 
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-center min-h-[400px] w-full relative">
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#83725E] border-t-transparent"></div>
                      </div>
                    )}
                    <img 
                      src={imageModal.src}
                      alt="Process"
                      className={`max-w-full max-h-[70vh] object-contain rounded-lg mx-auto transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                </div>
              </div>
            )}
      </main>
    </div>
  );
}

export default SIPOCPage
