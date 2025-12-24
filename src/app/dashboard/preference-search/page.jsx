'use client';

import React, { useState } from 'react';
import { Form, Button, Row, Col, Accordion, Tabs, Tab } from 'react-bootstrap';

export default function PreferenceSearchForm() {
    const [key, setKey] = useState('regular');
    const [formData, setFormData] = useState({
        ageFrom: 18,
        ageTo: 20,
        heightFrom: "5ft 1in",
        heightTo: "5ft 2in",
        maritalStatus: ["Never Married"],
        religion: "Hindu",
        motherTongue: "Odia",
        caste: "",
        physicalStatus: "",
        country: "India",
        state: "",
        city: "",
        education: [],
        income: '',
        occupation: '',
        horoscopeStar: '',
        manglik: 'Does not Matter',
        eatingHabits: [],
        drinkingHabits: [],
        smokingHabits: [],
        keyword: ''
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
                    ? [...(prev[name] || []), value]
                    : prev[name].filter(item => item !== value)
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitted Data:', formData);
    };

    const starOptions = ['Ashvini', 'Bharani', 'Krittika', 'Rohini'];
    const habitOptions = {
        eating: ['Vegetarian', 'Jain (Without Onion & Garlic)', 'Non Vegetarian', 'Omniverous', 'Eggetarian'],
        drinking: ['Never', 'Occasionally', 'Regular'],
        smoking: ['Never', 'Occasionally', 'Regular']
    };

    const educationList = [
        "Aeronautical Engineering - AE", "Any", "Any Graduate", "Auxiliary Nursing & Midwifery - ANM", "Aviation Degree",
        "Bachelor Financial Management - BFM", "Bachelor Hotel Management - BHM", "Bachelor in Electronics and Communication Engineering - BECE", "Bachelor of Architecture - B.Arch", "Bachelor of Arts - B.A.",
        "Bachelor of Ayurvedic Medicine and Surgery - BAMS", "Bachelor of Business Administration - BBA", "Bachelor of Business Management - BBM", "Bachelor of Commerce - B.Com", "Bachelor of Computer Applications - BCA",
        "Bachelor of Dental Surgery - BDS", "Bachelor of Fine Arts Courses - BFA", "Bachelor of Foreign Trade - BFT", "Bachelor of General Law - BGL",
        "Bachelor of General Law / Bachelor of Law / Bachelor of Legislative Law - BGL / B.L. / LL.B.", "Bachelor of Homeopathic Medicine and Surgery - BHMS", "Bachelor of Hospital Administration / Bachelor of Hotel Management- BHA / BHM",
        "Bachelor of Law - B.L.", "Bachelor of Legislative Law - LL.B.", "Bachelor of Library and Information Sciences - BLIS", "Bachelor of Mass Media - BMM", "Bachelor of Medicine and Bachelor of Surgery - MBBS",
        "Bachelor of Pharmacy - B.Pharma", "Bachelor of Philosophy - B.Phil", "Bachelor of Physiotherapy - BPT", "Bachelor of Planning - B.Plan", "Bachelor of Prosthetics and Orthotics - BPO",
        "Bachelor of Science - B.Sc.", "Bachelor of Science in Engineering - BSE", "Bachelor of Science in Information Technology - B.Sc IT", "Bachelor of Science in Nursing - B.Sc. Nursing",
        "Bachelor of Siddha Medicine and Surgery - BSMS", "Bachelor of Social Work - B.S.W.", "Bachelor of Technology - B.Tech", "Bachelor of Unani Medicine & Surgery - BUMS", "Bachelor of Veterinary Science - BVSc",
        "Bachelors in Engineering - BE", "Bachelors in Engineering / Bachelor of Technology - BE / B.Tech.", "Bachelor of Education - B.Ed", "Bachelors of Education - B.Ed", "Bio - Engineer", "Certificate of Teaching - CT",
        "Chartered Accountancy - CA", "Chartered Accountant - CA", "Certified Financial Analyst - CFA", "Company Secretary - CS",
        "Cost Management Accountant - CMA", "CRISIL Certified Analyst Programme - C-CAP", "Diploma in Medical Laboratory Technology - DMLT", "Diploma in Radiology Therapy - DRT", "Diploma in Pharmacy - D.Pharma",
        "Diploma in Pharmacy/ D.Pharma", "Doctor of Medicine - MD (MS Medicine)", "Doctor of Pharmacy - D.Pharma", "Doctor of Science", "Doctorate", "Other"
    ];

    return (
        <div className="container mt-4">
            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
                <Tab eventKey="regular" title="Regular Search">
                    <div className="text-muted text-center py-4">
                        Regular Search form same as Advanced Search (for now).
                    </div>
                </Tab>

                <Tab eventKey="advanced" title="Advanced Search">
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Age</Form.Label>
                                    <Row>
                                        <Col><Form.Control type="number" name="ageFrom" value={formData.ageFrom} onChange={handleChange} /></Col>
                                        <Col><Form.Control type="number" name="ageTo" value={formData.ageTo} onChange={handleChange} /></Col>
                                    </Row>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Height</Form.Label>
                                    <Row>
                                        <Col><Form.Control as="select" name="heightFrom" value={formData.heightFrom} onChange={handleChange}>{["4ft 10in", "5ft", "5ft 1in", "5ft 2in"].map(opt => <option key={opt}>{opt}</option>)}</Form.Control></Col>
                                        <Col><Form.Control as="select" name="heightTo" value={formData.heightTo} onChange={handleChange}>{["5ft 2in", "5ft 3in", "5ft 4in"].map(opt => <option key={opt}>{opt}</option>)}</Form.Control></Col>
                                    </Row>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mt-3">
                            <Form.Label>Marital Status</Form.Label><br />
                            {["Awaiting Divorce", "Divorced", "Never Married", "Widowed"].map((status, idx) => (
                                <Form.Check inline key={idx} label={status} type="checkbox" name="maritalStatus" value={status} checked={formData.maritalStatus.includes(status)} onChange={handleChange} />
                            ))}
                        </Form.Group>

                        <Row className="mt-3">
                            <Col md={4}><Form.Control placeholder="Religion" name="religion" value={formData.religion} onChange={handleChange} /></Col>
                            <Col md={4}><Form.Control placeholder="Mother Tongue" name="motherTongue" value={formData.motherTongue} onChange={handleChange} /></Col>
                            <Col md={4}><Form.Control placeholder="Caste" name="caste" value={formData.caste} onChange={handleChange} /></Col>
                        </Row>

                        <Row className="mt-3">
                            <Col md={4}><Form.Control as="select" name="physicalStatus" value={formData.physicalStatus} onChange={handleChange}>
                                <option value="">Select Physical Status</option>
                                <option value="Normal">Normal</option>
                                <option value="Physically Challenged">Physically Challenged</option>
                            </Form.Control></Col>
                        </Row>

                        <Accordion defaultActiveKey="0" className="mt-3">
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>Location Details</Accordion.Header>
                                <Accordion.Body>
                                    <Row>
                                        <Col md={4}><Form.Control placeholder="Country" name="country" value={formData.country} onChange={handleChange} /></Col>
                                        <Col md={4}><Form.Control placeholder="State" name="state" value={formData.state} onChange={handleChange} /></Col>
                                        <Col md={4}><Form.Control placeholder="City / Town" name="city" value={formData.city} onChange={handleChange} /></Col>
                                    </Row>
                                </Accordion.Body>
                            </Accordion.Item>

                            <Accordion.Item eventKey="1">
                                <Accordion.Header>Education / Occupation / Income</Accordion.Header>
                                <Accordion.Body>
                                    <Row>
                                        <Col md={6}><Form.Control placeholder="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} /></Col>
                                        <Col md={6}><Form.Control placeholder="Annual Income" name="income" value={formData.income} onChange={handleChange} /></Col>
                                    </Row>
                                    <div className="mt-3">
                                        <Row>
                                            {educationList.map((edu, i) => (
                                                <Col key={i} md={6} lg={4}><Form.Check type="checkbox" label={edu} value={edu} name="education" checked={formData.education.includes(edu)} onChange={handleChange} /></Col>
                                            ))}
                                        </Row>
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>

                            <Accordion.Item eventKey="2">
                                <Accordion.Header>Horoscope Details</Accordion.Header>
                                <Accordion.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Star</Form.Label>
                                        <Form.Select name="horoscopeStar" value={formData.horoscopeStar} onChange={handleChange}>
                                            <option value="">Select Star</option>
                                            {starOptions.map((star, idx) => <option key={idx} value={star}>{star}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                    <Form.Group>
                                        <Form.Label>Manglik</Form.Label><br />
                                        {['Does not Matter', 'No', 'Yes'].map((option, idx) => (
                                            <Form.Check inline key={idx} label={option} type="radio" name="manglik" value={option} checked={formData.manglik === option} onChange={handleChange} />
                                        ))}
                                    </Form.Group>
                                </Accordion.Body>
                            </Accordion.Item>

                            <Accordion.Item eventKey="3">
                                <Accordion.Header>Habits</Accordion.Header>
                                <Accordion.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Eating habits</Form.Label><br />
                                        {habitOptions.eating.map((h, i) => (
                                            <Form.Check inline key={i} type="checkbox" label={h} value={h} name="eatingHabits" checked={formData.eatingHabits.includes(h)} onChange={handleChange} />
                                        ))}
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Drinking Habit</Form.Label><br />
                                        {habitOptions.drinking.map((h, i) => (
                                            <Form.Check inline key={i} type="checkbox" label={h} value={h} name="drinkingHabits" checked={formData.drinkingHabits.includes(h)} onChange={handleChange} />
                                        ))}
                                    </Form.Group>

                                    <Form.Group>
                                        <Form.Label>Smoking Habit</Form.Label><br />
                                        {habitOptions.smoking.map((h, i) => (
                                            <Form.Check inline key={i} type="checkbox" label={h} value={h} name="smokingHabits" checked={formData.smokingHabits.includes(h)} onChange={handleChange} />
                                        ))}
                                    </Form.Group>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>

                        <div className="text-center mt-4">
                            <Button type="submit">Search</Button>
                        </div>
                    </Form>
                </Tab>

                <Tab eventKey="keyword" title="Keyword Search">
                    <Form className="mt-3" onSubmit={handleSubmit}>
                        <Form.Group>
                            <Form.Control
                                type="text"
                                placeholder="Example: hindu, agarwal, f, 25 - 30 Yrs, delhi"
                                name="keyword"
                                value={formData.keyword || ''}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <div className="mt-2 text-muted">
                            Example 1: hindu, agarwal, f, 25 - 30 Yrs, delhi<br />
                            Example 2: iyer, female, 25 Yrs, good looking.<br />
                            <small>Note: Due to privacy reasons name search is not available in keyword search.</small>
                        </div>
                        <div className="mt-3">
                            <Button type="submit">Search</Button>
                        </div>
                    </Form>
                </Tab>
            </Tabs>
        </div>
    );
}
