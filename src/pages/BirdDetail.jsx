import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Form, Row, Col, ListGroup, Button, Container } from "react-bootstrap";
import Rating from "../components/Rating";
import "../styles/PetDetail.css";
import Newsletter from "../components/Newsletter";
import Footer from "../components/Footer";
import axios from "axios"; // Make sure to install and import axios
import { addToCart } from "../slices/cartSlice";
import { useDispatch } from "react-redux";
const BirdDetail = () => {
  const { id: petId } = useParams();
  const [pet, setPet] = useState(null); // State to store the fetched pet details
  const [loading, setLoading] = useState(true); // State to manage loading status
  const [error, setError] = useState(null); // State to manage error status

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [qty, setQty] = useState(1);
  useEffect(() => {
    const fetchPetDetails = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/auth/birds/${petId}`
        );
        setPet(data);
      } catch (err) {
        setError(
          err.message || "An error occurred while fetching pet details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPetDetails();
  }, [petId]); // Dependency array ensures useEffect runs when petId changes

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!pet) {
    return <div>Pet not found</div>;
  }

  const addToCartHandler = () => {
    dispatch(addToCart({ ...pet, qty }));
    navigate("/cartpage");
  };
  return (
    <>
      <Container>
        <Row className="pt-5">
          <Col md={5}>
            <div className="zoomed-image">
              {" "}
              {/* Changed from <Container> to <div> for correct usage */}
              <img
                src={pet.image}
                alt={pet.name}
                className="pet-card-detail img-fluid ms-2 rounded-pill"
              />
            </div>
          </Col>
          <Col md={4}>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <h3>{pet.name}</h3>
              </ListGroup.Item>
              <ListGroup.Item>
                <Rating rating={pet.rating} maxRating={5} />
                {`${pet.numReviews} reviews`}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Price: ${pet.price}</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                <p className="mt-2">Description: {pet.description}</p>
              </ListGroup.Item>
              <ListGroup.Item>
                <p className="mt-2">
                  Status:{" "}
                  {pet.availability > 0
                    ? `Available ${pet.availability}`
                    : "Not Available"}
                </p>
              </ListGroup.Item>
              {pet.availability > 0 && (
                <ListGroup.Item>
                  <Row>
                    <Col>
                      <p className="mt-2 ms-1">Quantity:</p>
                    </Col>
                    <Col>
                      <Form.Control
                        as="select"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                      >
                        {[...Array(pet.availability).keys()].map((x) => (
                          <option key={x + 1} value={x + 1}>
                            {x + 1}
                          </option>
                        ))}
                      </Form.Control>
                    </Col>
                  </Row>
                </ListGroup.Item>
              )}
              <ListGroup.Item>
                <Button
                  className="mt-2 custom-detail-addtocard1"
                  type="button"
                  disabled={pet.availability === 0}
                  onClick={addToCartHandler}
                >
                  Add to Cart
                </Button>
                <Link className="btn btn-light mt-2 ms-4" to="/birds">
                  Go Back
                </Link>
              </ListGroup.Item>
            </ListGroup>
          </Col>
        </Row>
      </Container>
      <Newsletter />
      <Footer />
    </>
  );
};
export default BirdDetail;
