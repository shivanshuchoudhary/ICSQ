import { useState, useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/Table";
import Textarea from "../../components/ui/Textarea";
import axios from "axios";
import { capitalizeFirstLetter, getDepartmentName, Server } from "../../Constants";
import Select from "../../components/ui/Select";

function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    department: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${Server}/categories`, {
          withCredentials: true,
        });
        setCategories(response.data);

        const deptResponse = await axios.get(`${Server}/departments`, {
          withCredentials: true,
        });
        setAllDepartments([
          { name: "All Departments", _id: "" },
          ...deptResponse.data,
        ]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load categories and departments",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        [name]: value,
      });
    } else {
      setNewCategory({
        ...newCategory,
        [name]: value,
      });
    }
  };

  const handleDepartmentChange = (departmentIdValue) => {    
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        departmentId: departmentIdValue,
      });
    } else {
      setNewCategory({
        ...newCategory,
        department: departmentIdValue,
      });
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    console.log(newCategory);

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${Server}/categories`, newCategory, {
        withCredentials: true,
      });
      const addedCategory = response.data;
      
      setCategories([...categories, addedCategory]);
      setNewCategory({ name: "", description: "",department:"" });

      toast({
        title: "Success",
        description: "Category added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory({ ...category });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.put(
        `${Server}/categories/${editingCategory._id}`,
        editingCategory,
        { withCredentials: true }
      );

      // Update category in state
      setCategories(
        categories.map((cat) =>
          cat._id === editingCategory._id ? { ...editingCategory } : cat
        )
      );

      toast({
        title: "Success",
        description: "Category updated successfully",
      });

      setEditingCategory(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this category? This action is IRREVERSIBLE!"
      )
    ) {
      return;
    }

    try {
      await axios.delete(`${Server}/categories/${id}`, {
        withCredentials: true,
      });

      // Remove category from state
      setCategories(categories.filter((cat) => cat._id !== id));

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[goldenrod]">
            Manage Survey Categories
          </h1>
          <p className="text-gray-200">
            Add, edit, or remove survey categories in the system
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Survey Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category._id}>
                        <TableCell className="font-medium">
                          {capitalizeFirstLetter(category.name)}
                        </TableCell>
                        <TableCell>{getDepartmentName(category.department, allDepartments) || "All Departments"}</TableCell>
                        <TableCell>{category.description.slice(0,20)+"..."}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCategory(category._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          No categories found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={editingCategory ? undefined : handleAddCategory}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Name
                      </label>
                      <Input
                        name="name"
                        value={
                          editingCategory
                            ? editingCategory.name
                            : newCategory.name
                        }
                        onChange={handleInputChange}
                        placeholder="Category name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Department
                      </label>
                      <Select
                        name="departmentId"
                        value={
                          editingCategory
                            ? editingCategory?.department || ""
                            : newCategory?.department
                        }
                        label={
                          editingCategory
                            ? getDepartmentName(editingCategory?.department, allDepartments) || "All Departments"
                            : getDepartmentName(newCategory?.department,allDepartments) || "ALL Departments"
                        }
                        onValueChange={(value) => {
                          handleDepartmentChange(value);
                        }}
                        options={allDepartments?.map((dept, index) => ({
                          value: dept._id,
                          label: dept.name,
                          key: index,
                        }))}
                        placeholder="Select Department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-1">
                        Description
                      </label>
                      <Textarea
                        name="description"
                        value={
                          editingCategory
                            ? editingCategory.description
                            : newCategory.description
                        }
                        onChange={handleInputChange}
                        placeholder="Category description"
                        rows={3}
                      />
                    </div>

                    {editingCategory ? (
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={handleUpdateCategory}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          {isSubmitting ? "Updating..." : "Update Category"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? "Adding..." : "Add Category"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminCategoriesPage;
